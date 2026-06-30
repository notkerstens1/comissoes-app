import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// ENDPOINT PUBLICO (token-gated) — alimenta o dashboard externo
// da diretoria (Cloudflare Pages, identidade LIV). READ-ONLY.
// Serve JSON agregado do mes: KPIs, resultado real, unit economics,
// atipicas, funil (parcial), comercial por pessoa e canais.
// Fonte: comissoes-app (Supabase/Postgres). Meta/CAPI entram depois.
// ============================================================

// Shared-secret lido SO de env (DASHBOARD_PUBLIC_TOKEN no Railway). Nunca
// hardcodar o token aqui — vazaria no repo. Sem env configurada, o endpoint
// nega tudo (503) por seguranca.
const TOKEN = process.env.DASHBOARD_PUBLIC_TOKEN || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(mes: string): { since: string; until: string } {
  const [y, m] = mes.split("-").map(Number);
  const last = new Date(y, m, 0).getDate(); // m 1-based -> ultimo dia do mes
  return { since: `${mes}-01`, until: `${mes}-${String(last).padStart(2, "0")}` };
}

// Busca insights do Meta Ads (server-side, token + appsecret_proof em env).
// MQL = conversao custom CAPI (offsite_conversion.fb_pixel_custom). Falha vira
// null -> a tela mostra "aguardando integracao Meta" sem quebrar.
async function fetchMeta(mes: string) {
  const token = process.env.META_SYSTEM_TOKEN;
  const proof = process.env.META_APPSECRET_PROOF;
  const acc = process.env.META_AD_ACCOUNT_ID;
  if (!token || !proof || !acc) return null;
  const { since, until } = monthRange(mes);
  const tr = encodeURIComponent(JSON.stringify({ since, until }));
  const base = `https://graph.facebook.com/v21.0/${acc}/insights`;
  const common = `time_range=${tr}&access_token=${token}&appsecret_proof=${proof}`;
  const pick = (actions: any[], type: string) => {
    const a = (actions || []).find((x) => x.action_type === type);
    return a ? Number(a.value) : 0;
  };
  try {
    const [accRes, campRes] = await Promise.all([
      fetch(`${base}?level=account&fields=spend,actions&${common}`).then((r) => r.json()),
      fetch(`${base}?level=campaign&fields=campaign_name,spend,actions&${common}`).then((r) => r.json()),
    ]);
    if (accRes.error || campRes.error) return null;
    const accRow = (accRes.data || [])[0] || {};
    const spend = Number(accRow.spend || 0);
    const leads = pick(accRow.actions, "lead");
    const campanhas = (campRes.data || [])
      .map((c: any) => {
        const s = Number(c.spend || 0);
        const l = pick(c.actions, "lead");
        return { nome: c.campaign_name, spend: s, leads: l, cpl: l > 0 ? s / l : 0 };
      })
      .sort((a: any, b: any) => b.spend - a.spend);
    return { spend, leads, cpl: leads > 0 ? spend / leads : 0, campanhas };
  } catch {
    return null;
  }
}

// MQL real = reunioes/atendidos que os SDRs lancam na planilha LEADS_LIV,
// aba "ATENDIDOS (MQL)". CPF negado na aba "CPF NEGADO". Planilha publica
// (qualquer um com link) -> lemos o CSV via gviz, sem credencial. Cada linha
// cujo id comeca com "l:" e um lead; conta por created_time do mes.
async function fetchSheetMQL(mes: string) {
  const sid = process.env.SHEET_MQL_ID || "1583JgQTfjs0ZEgnjwgahJNnkq3nGzVSjcGeH7eSC-Bk";
  const contaTab = async (nome: string) => {
    const url = `https://docs.google.com/spreadsheets/d/${sid}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nome)}`;
    const txt = await fetch(url).then((r) => r.text());
    let count = 0;
    let ultima = "";
    for (const line of txt.split("\n")) {
      if (!/^"?l:/.test(line)) continue;
      const m = line.match(/(20\d\d-\d\d-\d\d)T/);
      if (m && m[1].startsWith(mes)) {
        count++;
        if (m[1] > ultima) ultima = m[1];
      }
    }
    return { count, ultima };
  };
  try {
    const [mqlT, cpfT] = await Promise.all([contaTab("ATENDIDOS (MQL)"), contaTab("CPF NEGADO")]);
    return { mql: mqlT.count, cpfNegado: cpfT.count, atualizadoAte: mqlT.ultima || null };
  } catch {
    return null;
  }
}

function autorizado(request: NextRequest): boolean {
  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const qp = new URL(request.url).searchParams.get("token") || "";
  return bearer === TOKEN || qp === TOKEN;
}

export async function GET(request: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json({ error: "Token nao configurado" }, { status: 503, headers: CORS });
  }
  if (!autorizado(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401, headers: CORS });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") || getCurrentMonth();

  const [vendasMes, config, usuarios, registrosSDR] = await Promise.all([
    prisma.venda.findMany({
      where: { mesReferencia: mes },
      include: { vendedor: { select: { id: true, nome: true, role: true } } },
    }),
    prisma.configuracao.findFirst(),
    prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true, role: true } }),
    prisma.registroSDR.findMany({ where: { dataReuniao: { startsWith: `${mes}-` } } }),
  ]);

  const normais = vendasMes.filter((v) => !v.atipica);
  const atipicasArr = vendasMes.filter((v) => v.atipica);

  // ---- KPIs (operacao recorrente, sem atipicas) ----
  const faturamento = normais.reduce((s, v) => s + v.valorVenda, 0);
  const custoTotalOperacional = normais.reduce(
    (s, v) =>
      s + v.custoEquipamentos + (v.custoInstalacao ?? 0) + (v.custoVisitaTecnica ?? 0) +
      (v.custoCosern ?? 0) + (v.custoTrtCrea ?? 0) + (v.custoEngenheiro ?? 0) +
      (v.custoMaterialCA ?? 0) + (v.custoImposto ?? 0) + (v.comissaoVendedorCusto ?? v.comissaoTotal),
    0
  );
  const lucroLiquido = faturamento - custoTotalOperacional;
  const margemMedia = faturamento > 0 ? lucroLiquido / faturamento : 0;
  const quantidadeVendas = normais.length;
  const ticketMedio = quantidadeVendas > 0 ? faturamento / quantidadeVendas : 0;

  // ---- Resultado real (custo fixo) ----
  const custoFixoMensal = config?.custoFixoMensal ?? 40000;
  const margemContribuicao = lucroLiquido;
  const resultadoOperacional = margemContribuicao - custoFixoMensal;
  const margemReal = faturamento > 0 ? resultadoOperacional / faturamento : 0;
  const pontoEquilibrio = margemMedia > 0 ? custoFixoMensal / margemMedia : 0;

  // ---- Unit economics + LTV v1 ----
  const ltvV1 = quantidadeVendas > 0 ? lucroLiquido / quantidadeVendas : 0; // lucro liquido medio por venda
  const cacMaximo = ltvV1 / 3; // proporcao saudavel 3:1

  // ---- Atipicas ----
  const atipicas = {
    quantidade: atipicasArr.length,
    faturamento: atipicasArr.reduce((s, v) => s + v.valorVenda, 0),
    lucroLiquido: atipicasArr.reduce((s, v) => s + (v.lucroLiquido ?? 0), 0),
  };

  // ---- Comparacao mes anterior (sem atipicas) ----
  const [ano, mesNum] = mes.split("-").map(Number);
  const mesAntDate = new Date(ano, mesNum - 2, 1);
  const mesAnterior = `${mesAntDate.getFullYear()}-${String(mesAntDate.getMonth() + 1).padStart(2, "0")}`;
  const vendasAnt = (await prisma.venda.findMany({ where: { mesReferencia: mesAnterior } })).filter((v) => !v.atipica);
  const faturamentoAnterior = vendasAnt.reduce((s, v) => s + v.valorVenda, 0);
  const lucroAnterior = vendasAnt.reduce((s, v) => s + (v.lucroLiquido ?? 0), 0);

  // ---- Comercial por pessoa: closers ----
  const closersMap = new Map<string, { nome: string; role: string; vendas: number; valorTotal: number; lucroTotal: number; comissaoTotal: number }>();
  for (const v of normais) {
    const k = v.vendedorId;
    const cur = closersMap.get(k) || { nome: v.vendedor.nome, role: v.vendedor.role, vendas: 0, valorTotal: 0, lucroTotal: 0, comissaoTotal: 0 };
    cur.vendas += 1;
    cur.valorTotal += v.valorVenda;
    cur.lucroTotal += v.lucroLiquido ?? 0;
    cur.comissaoTotal += v.comissaoVendedorCusto ?? v.comissaoTotal;
    closersMap.set(k, cur);
  }
  const closers = Array.from(closersMap.values())
    .map((c) => ({
      ...c,
      ticketMedio: c.vendas > 0 ? c.valorTotal / c.vendas : 0,
      margemPct: c.valorTotal > 0 ? c.lucroTotal / c.valorTotal : 0,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);

  // ---- Comercial por pessoa: SDR (reunioes do mes por dataReuniao) ----
  const sdrIds = new Set(usuarios.filter((u) => u.role === "SDR").map((u) => u.id));
  const nomePorId = new Map(usuarios.map((u) => [u.id, u.nome]));
  const sdrMap = new Map<string, { nome: string; reunioesAgendadas: number; compareceu: number; forecastPonderado: number }>();
  for (const r of registrosSDR) {
    if (!sdrIds.has(r.sdrId)) continue;
    const cur = sdrMap.get(r.sdrId) || { nome: nomePorId.get(r.sdrId) || "SDR", reunioesAgendadas: 0, compareceu: 0, forecastPonderado: 0 };
    cur.reunioesAgendadas += 1;
    if (r.compareceu) cur.compareceu += 1;
    if (r.estagioOportunidade !== "FECHADA") {
      cur.forecastPonderado += (r.valorForecast ?? 0) * ((r.probabilidade ?? 0) / 100);
    }
    sdrMap.set(r.sdrId, cur);
  }
  const sdrs = Array.from(sdrMap.values())
    .map((s) => ({ ...s, taxaComparecimento: s.reunioesAgendadas > 0 ? s.compareceu / s.reunioesAgendadas : 0 }))
    .sort((a, b) => b.reunioesAgendadas - a.reunioesAgendadas);

  // ---- Canais (classificacao: EXTERNA vence fonte) ----
  const canais = { trafego: { vendas: 0, receita: 0 }, indicacao: { vendas: 0, receita: 0 }, externo: { vendas: 0, receita: 0 }, outro: { vendas: 0, receita: 0 } };
  for (const v of normais) {
    let canal: keyof typeof canais;
    if (v.tipoVenda === "EXTERNA" || v.fonte === "EXTERNO") canal = "externo";
    else if (v.fonte === "TRAFEGO") canal = "trafego";
    else if (v.fonte === "INDICACAO") canal = "indicacao";
    else canal = "outro";
    canais[canal].vendas += 1;
    canais[canal].receita += v.valorVenda;
  }

  // ---- Meta Ads (investimento, leads) + MQL real da planilha SDR ----
  const [meta, sheet] = await Promise.all([fetchMeta(mes), fetchSheetMQL(mes)]);
  const mqlReal = sheet?.mql ?? null;

  // ---- Funil ponta a ponta (Meta no topo, planilha SDR no MQL, comissoes-app no fim) ----
  const funil = {
    investimento: meta?.spend ?? null,
    leads: meta?.leads ?? null,
    mql: mqlReal,
    reunioesRealizadas: registrosSDR.filter((r) => r.compareceu).length,
    vendas: quantidadeVendas,
  };

  // ---- Aquisicao (mídia paga): por campanha + CAC/ROAS de tráfego ----
  // MQL e CPMQL usam o MQL REAL da planilha (nao o sinal do Meta, que estava furado).
  const vendasTrafego = canais.trafego.vendas;
  const receitaTrafego = canais.trafego.receita;
  const aquisicao = meta
    ? {
        spend: meta.spend,
        leads: meta.leads,
        mql: mqlReal,
        cpl: meta.cpl,
        cpmql: mqlReal && mqlReal > 0 ? meta.spend / mqlReal : null,
        cpfNegado: sheet?.cpfNegado ?? null,
        mqlAtualizadoAte: sheet?.atualizadoAte ?? null,
        cac: vendasTrafego > 0 ? meta.spend / vendasTrafego : null,
        roas: meta.spend > 0 ? receitaTrafego / meta.spend : null,
        vendasTrafego,
        receitaTrafego,
        campanhas: meta.campanhas,
      }
    : null;

  // Lista de TODAS as vendas do mes (inclui atipicas, com flag) — pra conferencia
  const listaVendas = vendasMes
    .slice()
    .sort((a, b) => b.dataConversao.getTime() - a.dataConversao.getTime())
    .map((v) => ({
      cliente: v.cliente,
      vendedor: v.vendedor.nome,
      valorVenda: v.valorVenda,
      lucroLiquido: v.lucroLiquido ?? 0,
      margemLucroLiquido: v.margemLucroLiquido ?? 0,
      status: v.status,
      fonte: v.fonte,
      tipoVenda: v.tipoVenda,
      atipica: v.atipica,
      data: v.dataConversao.toISOString().slice(0, 10),
    }));

  return NextResponse.json(
    {
      mes,
      totalVendasMes: vendasMes.length,
      kpis: { faturamento, lucroLiquido, margemMedia, ticketMedio, quantidadeVendas, custoTotalOperacional },
      resultadoReal: { margemContribuicao, custoFixoMensal, resultadoOperacional, margemReal, pontoEquilibrio },
      unitEconomics: { ticketMedio, margemMediaPct: margemMedia, ltvV1, cacMaximo },
      atipicas,
      comparacao: {
        mesAnterior,
        faturamentoAnterior,
        lucroAnterior,
        variacaoFaturamento: faturamentoAnterior > 0 ? ((faturamento - faturamentoAnterior) / faturamentoAnterior) * 100 : 0,
        variacaoLucro: lucroAnterior > 0 ? ((lucroLiquido - lucroAnterior) / lucroAnterior) * 100 : 0,
      },
      funil,
      aquisicao,
      closers,
      sdrs,
      canais,
      vendas: listaVendas,
      _meta: { fonte: "comissoes-app + Meta Ads + planilha SDR", ltv: "v1 (lucro liquido medio por venda)", mql: "planilha LEADS_LIV aba ATENDIDOS (MQL)", midiaPaga: meta ? "Meta Ads (investimento/leads)" : "indisponivel (checar token Meta)" },
    },
    { headers: CORS }
  );
}

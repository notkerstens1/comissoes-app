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

  // ---- Funil (parcial — topo depende de Meta/ChatClean, ainda nao integrado) ----
  const funil = {
    investimento: null as number | null,
    leads: null as number | null,
    mql: null as number | null,
    reunioesRealizadas: registrosSDR.filter((r) => r.compareceu).length,
    vendas: quantidadeVendas,
  };

  return NextResponse.json(
    {
      mes,
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
      closers,
      sdrs,
      canais,
      _meta: { fonte: "comissoes-app", ltv: "v1 (lucro liquido medio por venda)", midiaPaga: "aguardando integracao Meta/CAPI" },
    },
    { headers: CORS }
  );
}

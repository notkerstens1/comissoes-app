import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewDashboardCRO } from "@/lib/roles";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { getNow, formatDateStr } from "@/lib/dates";

// Dashboard CRO v1 — visao integrada marketing x vendas
// Cruza canais (Trafego/Indicacao/Externo Daniel) com Meta Ads (skill ratos -> MetaAdsCampaign).
// Hierarquia: tipoVenda=EXTERNA ganha (vai pra "Externo Daniel"), independente da fonte.
// Restante usa o campo `fonte` (TRAFEGO|INDICACAO). Sem fonte = "Nao classificado".

type CanalKey = "trafego" | "indicacao" | "externoDaniel" | "naoClassificado";

interface CanalAgregado {
  vendas: number;
  receita: number;
  ticketMedio: number;
  percentualReceita: number;
}

interface VendaLite {
  id: string;
  cliente: string;
  vendedorNome: string;
  dataConversao: Date;
  valorVenda: number;
  fonte: string | null;
  tipoVenda: string;
}

function classificarCanal(v: { fonte: string | null; tipoVenda: string }): CanalKey {
  if (v.tipoVenda === "EXTERNA") return "externoDaniel";
  // FOLLOWUP = lead originado do trafego (vendedor assumiu apos followup), entao
  // conta como trafego para ROAS/CAC.
  if (v.fonte === "TRAFEGO" || v.fonte === "FOLLOWUP") return "trafego";
  if (v.fonte === "INDICACAO") return "indicacao";
  return "naoClassificado";
}

function agregarCanal(vendas: VendaLite[], totalReceitaPeriodo: number): CanalAgregado {
  const receita = vendas.reduce((s, v) => s + v.valorVenda, 0);
  return {
    vendas: vendas.length,
    receita,
    ticketMedio: vendas.length > 0 ? receita / vendas.length : 0,
    percentualReceita: totalReceitaPeriodo > 0 ? (receita / totalReceitaPeriodo) * 100 : 0,
  };
}

function deltaPct(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!canViewDashboardCRO(role)) {
    return NextResponse.json({ error: "Acesso restrito a Diretor e Supervisor" }, { status: 403 });
  }

  // Periodo: default = mes corrente
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  const now = getNow();
  const startDate = startParam ? new Date(startParam) : startOfMonth(now);
  const endDate = endParam ? new Date(endParam) : endOfMonth(now);

  // Periodo de comparacao: mes anterior com mesma duracao
  const mesAnteriorStart = startOfMonth(subMonths(startDate, 1));
  const mesAnteriorEnd = endOfMonth(subMonths(startDate, 1));

  // String "YYYY-MM-DD" pros joins com MetaAdsCampaign (que usa string)
  const startStr = formatDateStr(startDate);
  const endStr = formatDateStr(endDate);

  const [vendasPeriodo, vendasMesAnterior, metaAds] = await Promise.all([
    prisma.venda.findMany({
      where: {
        dataConversao: { gte: startDate, lte: endDate },
        status: { not: "CANCELADO" },
      },
      include: { vendedor: { select: { nome: true } } },
      orderBy: { dataConversao: "desc" },
    }),
    prisma.venda.findMany({
      where: {
        dataConversao: { gte: mesAnteriorStart, lte: mesAnteriorEnd },
        status: { not: "CANCELADO" },
      },
      select: { valorVenda: true, fonte: true, tipoVenda: true },
    }),
    prisma.metaAdsCampaign.findMany({
      where: { data: { gte: startStr, lte: endStr } },
      orderBy: { data: "asc" },
    }),
  ]);

  // Normaliza vendas pra estrutura leve
  const vendasLite: VendaLite[] = vendasPeriodo.map((v) => ({
    id: v.id,
    cliente: v.cliente,
    vendedorNome: v.vendedor.nome,
    dataConversao: v.dataConversao,
    valorVenda: v.valorVenda,
    fonte: v.fonte && v.fonte.length > 0 ? v.fonte : null,
    tipoVenda: v.tipoVenda,
  }));

  // Agrupa por canal (periodo atual)
  const grupos: Record<CanalKey, VendaLite[]> = {
    trafego: [],
    indicacao: [],
    externoDaniel: [],
    naoClassificado: [],
  };
  for (const v of vendasLite) grupos[classificarCanal(v)].push(v);

  const receitaTotal = vendasLite.reduce((s, v) => s + v.valorVenda, 0);

  const canais = {
    trafego: agregarCanal(grupos.trafego, receitaTotal),
    indicacao: agregarCanal(grupos.indicacao, receitaTotal),
    externoDaniel: agregarCanal(grupos.externoDaniel, receitaTotal),
    naoClassificado: agregarCanal(grupos.naoClassificado, receitaTotal),
  };

  // Breakdown do Daniel: dentro das vendas EXTERNA, quantas marcaram fonte=TRAFEGO vs INDICACAO
  const externoBreakdown = {
    trafego: grupos.externoDaniel.filter((v) => v.fonte === "TRAFEGO").length,
    indicacao: grupos.externoDaniel.filter((v) => v.fonte === "INDICACAO").length,
    semFonte: grupos.externoDaniel.filter((v) => !v.fonte).length,
  };

  // Comparacao mes anterior (mesma logica de classificacao)
  const gruposMesAnterior: Record<CanalKey, { vendas: number; receita: number }> = {
    trafego: { vendas: 0, receita: 0 },
    indicacao: { vendas: 0, receita: 0 },
    externoDaniel: { vendas: 0, receita: 0 },
    naoClassificado: { vendas: 0, receita: 0 },
  };
  for (const v of vendasMesAnterior) {
    const canal = classificarCanal({
      fonte: v.fonte && v.fonte.length > 0 ? v.fonte : null,
      tipoVenda: v.tipoVenda,
    });
    gruposMesAnterior[canal].vendas += 1;
    gruposMesAnterior[canal].receita += v.valorVenda;
  }

  const comparacaoMesAnterior = {
    trafego: {
      vendasDelta: canais.trafego.vendas - gruposMesAnterior.trafego.vendas,
      vendasDeltaPct: deltaPct(canais.trafego.vendas, gruposMesAnterior.trafego.vendas),
      receitaDelta: canais.trafego.receita - gruposMesAnterior.trafego.receita,
      receitaDeltaPct: deltaPct(canais.trafego.receita, gruposMesAnterior.trafego.receita),
    },
    indicacao: {
      vendasDelta: canais.indicacao.vendas - gruposMesAnterior.indicacao.vendas,
      vendasDeltaPct: deltaPct(canais.indicacao.vendas, gruposMesAnterior.indicacao.vendas),
      receitaDelta: canais.indicacao.receita - gruposMesAnterior.indicacao.receita,
      receitaDeltaPct: deltaPct(canais.indicacao.receita, gruposMesAnterior.indicacao.receita),
    },
    externoDaniel: {
      vendasDelta: canais.externoDaniel.vendas - gruposMesAnterior.externoDaniel.vendas,
      vendasDeltaPct: deltaPct(canais.externoDaniel.vendas, gruposMesAnterior.externoDaniel.vendas),
      receitaDelta: canais.externoDaniel.receita - gruposMesAnterior.externoDaniel.receita,
      receitaDeltaPct: deltaPct(canais.externoDaniel.receita, gruposMesAnterior.externoDaniel.receita),
    },
  };

  // Qualidade do dado
  const vendasSemFonte = grupos.naoClassificado.map((v) => ({
    id: v.id,
    cliente: v.cliente,
    vendedorNome: v.vendedorNome,
    dataConversao: v.dataConversao,
    valorVenda: v.valorVenda,
  }));
  const qualidadeDado = {
    totalVendas: vendasLite.length,
    classificadas: vendasLite.length - vendasSemFonte.length,
    semFonte: vendasSemFonte.length,
    percentualClassificadas:
      vendasLite.length > 0 ? ((vendasLite.length - vendasSemFonte.length) / vendasLite.length) * 100 : 100,
    vendasSemFonte,
  };

  // Cruzamento Meta x Vendas
  // Agrupa MetaAdsCampaign por campaignId (somando os dias do periodo)
  const campanhasMap = new Map<
    string,
    { campaignId: string; campaignName: string; spend: number; impressions: number; clicks: number; leads: number }
  >();
  for (const ma of metaAds) {
    const key = ma.campaignId;
    const acc = campanhasMap.get(key) ?? {
      campaignId: ma.campaignId,
      campaignName: ma.campaignName,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
    };
    acc.spend += ma.spend;
    acc.impressions += ma.impressions;
    acc.clicks += ma.clicks;
    acc.leads += ma.leads;
    campanhasMap.set(key, acc);
  }

  const spendTotal = Array.from(campanhasMap.values()).reduce((s, c) => s + c.spend, 0);
  const leadsTotal = Array.from(campanhasMap.values()).reduce((s, c) => s + c.leads, 0);
  const vendasTrafego = canais.trafego.vendas;
  const receitaTrafego = canais.trafego.receita;

  const porCampanha = Array.from(campanhasMap.values())
    .map((c) => ({
      ...c,
      cpl: c.leads > 0 ? c.spend / c.leads : 0,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  const metaVsVendas = {
    spendTotal,
    leadsTotal,
    vendasTrafego,
    receitaTrafego,
    cplGlobal: leadsTotal > 0 ? spendTotal / leadsTotal : 0,
    cac: vendasTrafego > 0 ? spendTotal / vendasTrafego : 0,
    roas: spendTotal > 0 ? receitaTrafego / spendTotal : 0,
    taxaConversaoLeadVenda: leadsTotal > 0 ? (vendasTrafego / leadsTotal) * 100 : 0,
    porCampanha,
  };

  // Alerta de concentracao: canal com >60% da receita
  let canalDominante: { canal: CanalKey; percentual: number } | null = null;
  for (const k of ["trafego", "indicacao", "externoDaniel"] as CanalKey[]) {
    if (canais[k].percentualReceita > 60) {
      canalDominante = { canal: k, percentual: canais[k].percentualReceita };
      break;
    }
  }

  return NextResponse.json({
    periodo: {
      startDate: startStr,
      endDate: endStr,
      mesAnterior: {
        startDate: formatDateStr(mesAnteriorStart),
        endDate: formatDateStr(mesAnteriorEnd),
      },
    },
    qualidadeDado,
    canais,
    externoBreakdown,
    comparacaoMesAnterior,
    metaVsVendas,
    alertaConcentracao: canalDominante
      ? { exibir: true, canal: canalDominante.canal, percentual: canalDominante.percentual }
      : { exibir: false, canal: null, percentual: 0 },
    totaisPeriodo: {
      receitaTotal,
      vendasTotal: vendasLite.length,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKPIs, getInvestment } from "@/lib/kpis";

// GET /api/revenue/overview — Dados agregados para aba Visao Geral
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate e endDate obrigatorios" }, { status: 400 });
  }

  // Buscar dados em paralelo
  const [
    trafficRecords,
    commercialRecords,
    vendas,
    campaignRecords,
    gronnerLeads,
    goals,
  ] = await Promise.all([
    prisma.dailyTraffic.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      orderBy: { data: "asc" },
    }),
    prisma.dailyCommercial.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      include: { vendedor: { select: { id: true, nome: true, role: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.venda.findMany({
      where: {
        dataConversao: { gte: new Date(startDate), lte: new Date(endDate) },
        status: { not: "CANCELADO" },
      },
      include: { vendedor: { select: { id: true, nome: true } } },
    }),
    prisma.metaAdsCampaign.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      orderBy: { data: "asc" },
    }),
    prisma.gronnerLead.findMany({
      where: { synced_at: { gte: new Date(startDate) } },
    }),
    prisma.campanha.findMany({
      where: { ativa: true, dataInicio: { lte: endDate }, dataFim: { gte: startDate } },
    }),
  ]);

  // --- Totais de Trafego ---
  const trafficTotals = {
    pessoasAlcancadas: trafficRecords.reduce((s, t) => s + t.pessoasAlcancadas, 0),
    totalLeads: trafficRecords.reduce((s, t) => s + t.totalLeads, 0),
    valorInvestidoVendas: trafficRecords.reduce((s, t) => s + t.valorInvestidoVendas, 0),
    valorGasto: trafficRecords.reduce((s, t) => s + t.valorGasto, 0),
  };

  // --- Totais Comercial ---
  const commercialTotals = {
    atendidos: commercialRecords.reduce((s, c) => s + c.atendidos, 0),
    mql: commercialRecords.reduce((s, c) => s + c.mql, 0),
    reunioes: commercialRecords.reduce((s, c) => s + c.reunioes, 0),
    propostas: commercialRecords.reduce((s, c) => s + c.propostas, 0),
    fechados: commercialRecords.reduce((s, c) => s + c.fechados, 0),
    valorEmVendas: commercialRecords.reduce((s, c) => s + c.valorEmVendas, 0),
  };

  // --- KPIs ---
  const investment = trafficTotals.valorInvestidoVendas;
  const kpis = calculateKPIs(
    investment,
    trafficTotals.pessoasAlcancadas,
    trafficTotals.totalLeads,
    commercialTotals.mql,
    commercialTotals.reunioes,
    commercialTotals.fechados
  );

  // Leads qualificados (score >= 60)
  const qualifiedLeads = gronnerLeads.filter((l) => l.icpScore >= 60).length;
  const cplQualificado = qualifiedLeads > 0 ? investment / qualifiedLeads : null;

  // Receita total
  const receitaTotal = vendas.reduce((s, v) => s + v.valorVenda, 0);
  const ticketMedio = vendas.length > 0 ? receitaTotal / vendas.length : null;
  const roi = investment > 0 ? ((receitaTotal - investment) / investment) * 100 : null;

  // --- Funil ---
  const funnel = {
    leads: trafficTotals.totalLeads,
    qualificados: qualifiedLeads,
    reunioes: commercialTotals.reunioes,
    propostas: commercialTotals.propostas,
    fechados: vendas.length,
    receita: receitaTotal,
  };

  // --- Trend (diario) ---
  const trendMap = new Map<string, { spend: number; leads: number; sales: number; revenue: number }>();
  for (const t of trafficRecords) {
    trendMap.set(t.data, { spend: t.valorGasto, leads: t.totalLeads, sales: 0, revenue: 0 });
  }
  for (const v of vendas) {
    const d = v.dataConversao.toISOString().split("T")[0];
    const entry = trendMap.get(d) || { spend: 0, leads: 0, sales: 0, revenue: 0 };
    entry.sales++;
    entry.revenue += v.valorVenda;
    trendMap.set(d, entry);
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  // --- Performance do Time ---
  const teamMap = new Map<string, {
    nome: string; role: string;
    leads: number; reunioes: number; propostas: number; fechados: number;
    receita: number;
  }>();

  for (const c of commercialRecords) {
    const key = c.vendedorId;
    const entry = teamMap.get(key) || {
      nome: c.vendedor.nome,
      role: c.vendedor.role,
      leads: 0, reunioes: 0, propostas: 0, fechados: 0, receita: 0,
    };
    entry.leads += c.atendidos;
    entry.reunioes += c.reunioes;
    entry.propostas += c.propostas;
    entry.fechados += c.fechados;
    teamMap.set(key, entry);
  }
  for (const v of vendas) {
    const entry = teamMap.get(v.vendedorId);
    if (entry) entry.receita += v.valorVenda;
  }
  const team = Array.from(teamMap.values()).map((t) => ({
    ...t,
    conversao: t.leads > 0 ? Math.round((t.fechados / t.leads) * 100) : 0,
    ticketMedio: t.fechados > 0 ? t.receita / t.fechados : 0,
  }));

  // --- Campanhas ---
  const campMap = new Map<string, {
    nome: string; spend: number; leads: number; messages: number;
    impressions: number; clicks: number;
  }>();
  for (const c of campaignRecords) {
    const key = c.campaignId;
    const entry = campMap.get(key) || {
      nome: c.campaignName, spend: 0, leads: 0, messages: 0, impressions: 0, clicks: 0,
    };
    entry.spend += c.spend;
    entry.leads += c.leads;
    entry.messages += c.messages;
    entry.impressions += c.impressions;
    entry.clicks += c.clicks;
    campMap.set(key, entry);
  }
  const campaigns = Array.from(campMap.values()).map((c) => ({
    ...c,
    totalResults: c.leads + c.messages,
    cpl: (c.leads + c.messages) > 0 ? c.spend / (c.leads + c.messages) : null,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
  }));

  // --- Alertas ---
  const alerts: Array<{ tipo: string; mensagem: string; severidade: "info" | "warning" | "danger" }> = [];
  if (kpis.cpl && kpis.cpl > 50) {
    alerts.push({ tipo: "cpl_alto", mensagem: `CPL esta em R$ ${kpis.cpl.toFixed(2)} — considere otimizar campanhas`, severidade: "warning" });
  }
  if (team.some((t) => t.reunioes === 0 && t.leads > 5)) {
    alerts.push({ tipo: "sem_reuniao", mensagem: "Vendedor com leads mas zero reunioes no periodo", severidade: "danger" });
  }

  // --- Filtrar por role ---
  const response: any = {
    funnel,
    kpis: {
      ...kpis,
      cplQualificado,
      ticketMedio,
      roi,
      gasto: trafficTotals.valorGasto,
      receitaTotal,
    },
    trend,
    team: role === "VENDEDOR" || role === "VENDEDOR_EXTERNO"
      ? team.filter((t) => t.nome === session.user.name)
      : role === "SDR"
        ? [] // SDR nao ve performance de vendedores
        : team,
    campaigns,
    goals: goals.map((g) => ({
      titulo: g.titulo,
      tipo: g.tipo,
      meta: g.meta,
      dataFim: g.dataFim,
    })),
    alerts,
  };

  // Remover dados financeiros se nao for diretor
  if (role !== "DIRETOR") {
    delete response.kpis.roi;
    delete response.kpis.receitaTotal;
    delete response.kpis.ticketMedio;
  }

  return NextResponse.json(response);
}

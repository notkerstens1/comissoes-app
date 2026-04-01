import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

// GET /api/revenue/financeiro — Dados da aba Financeiro (DIRETOR only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor((session.user as any).role)) {
    return NextResponse.json({ error: "Apenas diretor pode acessar dados financeiros" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate e endDate obrigatorios" }, { status: 400 });
  }

  const [vendas, niboRecords, trafficRecords] = await Promise.all([
    prisma.venda.findMany({
      where: {
        dataConversao: { gte: new Date(startDate), lte: new Date(endDate) },
        status: { not: "CANCELADO" },
      },
    }),
    prisma.niboRecord.findMany({
      where: {
        dataVencimento: { gte: startDate, lte: endDate },
      },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.dailyTraffic.findMany({
      where: { data: { gte: startDate, lte: endDate } },
    }),
  ]);

  // Receita (vendas)
  const receitaTotal = vendas.reduce((s, v) => s + v.valorVenda, 0);
  const custoEquipTotal = vendas.reduce((s, v) => s + v.custoEquipamentos, 0);
  const lucroLiquidoTotal = vendas.reduce((s, v) => s + (v.lucroLiquido || 0), 0);
  const margemMedia = vendas.length > 0
    ? vendas.reduce((s, v) => s + (v.margemLucroLiquido || 0), 0) / vendas.length
    : 0;

  // Financeiro (Nibo)
  const recebimentos = niboRecords.filter((r) => r.tipo === "receber");
  const pagamentos = niboRecords.filter((r) => r.tipo === "pagar");

  const totalReceber = recebimentos.reduce((s, r) => s + r.valor, 0);
  const totalPagar = pagamentos.reduce((s, r) => s + r.valor, 0);
  const totalRecebido = recebimentos.filter((r) => r.status === "pago").reduce((s, r) => s + r.valor, 0);
  const totalPago = pagamentos.filter((r) => r.status === "pago").reduce((s, r) => s + r.valor, 0);
  const totalVencido = niboRecords.filter((r) => r.status === "vencido").reduce((s, r) => s + r.valor, 0);

  // Investimento em ads
  const investimentoAds = trafficRecords.reduce((s, t) => s + t.valorGasto, 0);

  // CAC
  const cac = vendas.length > 0 ? investimentoAds / vendas.length : null;
  const ticketMedio = vendas.length > 0 ? receitaTotal / vendas.length : null;

  // Trend financeiro (por mes)
  const financialTrend = new Map<string, { receita: number; despesa: number }>();
  for (const r of recebimentos) {
    const mes = r.dataVencimento.slice(0, 7);
    const entry = financialTrend.get(mes) || { receita: 0, despesa: 0 };
    entry.receita += r.valor;
    financialTrend.set(mes, entry);
  }
  for (const p of pagamentos) {
    const mes = p.dataVencimento.slice(0, 7);
    const entry = financialTrend.get(mes) || { receita: 0, despesa: 0 };
    entry.despesa += p.valor;
    financialTrend.set(mes, entry);
  }

  const trend = Array.from(financialTrend.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => ({ mes, ...data, saldo: data.receita - data.despesa }));

  return NextResponse.json({
    kpis: {
      receitaTotal,
      custoEquipTotal,
      lucroLiquidoTotal,
      margemMedia: Math.round(margemMedia * 10000) / 100, // %
      investimentoAds,
      cac,
      ticketMedio,
      roi: investimentoAds > 0 ? ((receitaTotal - investimentoAds) / investimentoAds) * 100 : null,
      totalReceber,
      totalPagar,
      totalRecebido,
      totalPago,
      totalVencido,
    },
    trend,
    vendasCount: vendas.length,
  });
}

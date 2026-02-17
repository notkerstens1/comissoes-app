import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { calculateKPIs, getInvestment } from "@/lib/kpis";
import { getDaysInRange } from "@/lib/dates";

// GET - Resumo agregado de performance para um periodo
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const investmentType = (searchParams.get("investmentType") || "vendas") as "vendas" | "total";

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate e endDate obrigatorios" }, { status: 400 });
  }

  // Buscar dados do periodo
  const [trafficRecords, commercialRecords, vendors] = await Promise.all([
    prisma.dailyTraffic.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      orderBy: { data: "asc" },
    }),
    prisma.dailyCommercial.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      include: { vendedor: { select: { id: true, nome: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "VENDEDOR", ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  // Indexar por data para facilitar
  const trafficByDate = new Map(trafficRecords.map((t) => [t.data, t]));
  const commercialByDate = new Map<string, typeof commercialRecords>();
  for (const c of commercialRecords) {
    const arr = commercialByDate.get(c.data) || [];
    arr.push(c);
    commercialByDate.set(c.data, arr);
  }

  // Totais de trafego
  const trafficTotals = {
    pessoasAlcancadas: trafficRecords.reduce((s, t) => s + t.pessoasAlcancadas, 0),
    totalLeads: trafficRecords.reduce((s, t) => s + t.totalLeads, 0),
    valorInvestidoVendas: trafficRecords.reduce((s, t) => s + t.valorInvestidoVendas, 0),
    valorInvestidoBranding: trafficRecords.reduce((s, t) => s + t.valorInvestidoBranding, 0),
    valorGasto: trafficRecords.reduce((s, t) => s + t.valorGasto, 0),
  };

  // Totais comercial
  const commercialTotals = {
    atendidos: commercialRecords.reduce((s, c) => s + c.atendidos, 0),
    mql: commercialRecords.reduce((s, c) => s + c.mql, 0),
    reunioes: commercialRecords.reduce((s, c) => s + c.reunioes, 0),
    propostas: commercialRecords.reduce((s, c) => s + c.propostas, 0),
    fechados: commercialRecords.reduce((s, c) => s + c.fechados, 0),
    valorEmVendas: commercialRecords.reduce((s, c) => s + c.valorEmVendas, 0),
    leadsDescartados: commercialRecords.reduce((s, c) => s + c.leadsDescartados, 0),
  };

  // KPIs calculados sobre os TOTAIS (nunca media de medias)
  const totalInvestment = getInvestment(
    trafficTotals.valorInvestidoVendas,
    trafficTotals.valorInvestidoBranding,
    investmentType
  );

  const kpis = calculateKPIs(
    totalInvestment,
    trafficTotals.pessoasAlcancadas,
    trafficTotals.totalLeads,
    commercialTotals.mql,
    commercialTotals.reunioes,
    commercialTotals.fechados
  );

  // Dados diarios (para graficos) - preenche zeros para dias sem dados
  const allDays = getDaysInRange(startDate, endDate);
  const dailyData = allDays.map((date) => {
    const t = trafficByDate.get(date);
    const comms = commercialByDate.get(date) || [];

    const dayCommercial = {
      atendidos: comms.reduce((s, c) => s + c.atendidos, 0),
      mql: comms.reduce((s, c) => s + c.mql, 0),
      reunioes: comms.reduce((s, c) => s + c.reunioes, 0),
      propostas: comms.reduce((s, c) => s + c.propostas, 0),
      fechados: comms.reduce((s, c) => s + c.fechados, 0),
      valorEmVendas: comms.reduce((s, c) => s + c.valorEmVendas, 0),
      leadsDescartados: comms.reduce((s, c) => s + c.leadsDescartados, 0),
    };

    return {
      date,
      traffic: {
        pessoasAlcancadas: t?.pessoasAlcancadas ?? 0,
        totalLeads: t?.totalLeads ?? 0,
        valorInvestidoVendas: t?.valorInvestidoVendas ?? 0,
        valorInvestidoBranding: t?.valorInvestidoBranding ?? 0,
        valorGasto: t?.valorGasto ?? 0,
      },
      commercial: dayCommercial,
    };
  });

  // Breakdown por vendedor
  const vendorMap = new Map<string, {
    vendedorId: string; nome: string;
    atendidos: number; mql: number; reunioes: number;
    propostas: number; fechados: number;
    valorEmVendas: number; leadsDescartados: number;
  }>();

  for (const v of vendors) {
    vendorMap.set(v.id, {
      vendedorId: v.id, nome: v.nome,
      atendidos: 0, mql: 0, reunioes: 0,
      propostas: 0, fechados: 0,
      valorEmVendas: 0, leadsDescartados: 0,
    });
  }

  for (const c of commercialRecords) {
    const existing = vendorMap.get(c.vendedorId);
    if (existing) {
      existing.atendidos += c.atendidos;
      existing.mql += c.mql;
      existing.reunioes += c.reunioes;
      existing.propostas += c.propostas;
      existing.fechados += c.fechados;
      existing.valorEmVendas += c.valorEmVendas;
      existing.leadsDescartados += c.leadsDescartados;
    }
  }

  const vendorBreakdown = Array.from(vendorMap.values());

  // Completude do diario
  const vendorCount = vendors.length;
  const completeness = allDays.map((date) => {
    const hasTraffic = trafficByDate.has(date);
    const comms = commercialByDate.get(date) || [];
    const hasCommercial = comms.length >= vendorCount && vendorCount > 0;

    let status = "vazio";
    if (hasTraffic && hasCommercial) status = "completo";
    else if (hasTraffic && !hasCommercial) status = "falta_comercial";
    else if (!hasTraffic && hasCommercial) status = "falta_trafego";
    else if (comms.length > 0 || hasTraffic) status = hasTraffic ? "falta_comercial" : "falta_trafego";

    return { date, hasTraffic, hasCommercial, status };
  });

  return NextResponse.json({
    period: { startDate, endDate },
    trafficTotals,
    commercialTotals,
    kpis,
    dailyData,
    vendorBreakdown,
    completeness,
  });
}

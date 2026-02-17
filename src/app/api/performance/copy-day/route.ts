import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isDiretor } from "@/lib/roles";

// POST - Copiar dados de um dia para outro
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { sourceDate, targetDate } = body;

  if (!sourceDate || !targetDate) {
    return NextResponse.json({ error: "sourceDate e targetDate obrigatorios" }, { status: 400 });
  }

  const operations: any[] = [];

  // Copiar trafego (somente DIRETOR)
  if (isDiretor(session.user.role)) {
    const sourceTraffic = await prisma.dailyTraffic.findUnique({
      where: { data: sourceDate },
    });

    if (sourceTraffic) {
      operations.push(
        prisma.dailyTraffic.upsert({
          where: { data: targetDate },
          update: {
            pessoasAlcancadas: sourceTraffic.pessoasAlcancadas,
            totalLeads: sourceTraffic.totalLeads,
            valorInvestidoVendas: sourceTraffic.valorInvestidoVendas,
            valorInvestidoBranding: sourceTraffic.valorInvestidoBranding,
            valorGasto: sourceTraffic.valorGasto,
          },
          create: {
            data: targetDate,
            pessoasAlcancadas: sourceTraffic.pessoasAlcancadas,
            totalLeads: sourceTraffic.totalLeads,
            valorInvestidoVendas: sourceTraffic.valorInvestidoVendas,
            valorInvestidoBranding: sourceTraffic.valorInvestidoBranding,
            valorGasto: sourceTraffic.valorGasto,
          },
        })
      );
    }
  }

  // Copiar comercial (ADMIN e DIRETOR)
  const sourceCommercials = await prisma.dailyCommercial.findMany({
    where: { data: sourceDate },
  });

  for (const c of sourceCommercials) {
    operations.push(
      prisma.dailyCommercial.upsert({
        where: {
          data_vendedorId: { data: targetDate, vendedorId: c.vendedorId },
        },
        update: {
          atendidos: c.atendidos,
          mql: c.mql,
          reunioes: c.reunioes,
          propostas: c.propostas,
          fechados: c.fechados,
          valorEmVendas: c.valorEmVendas,
          leadsDescartados: c.leadsDescartados,
        },
        create: {
          data: targetDate,
          vendedorId: c.vendedorId,
          atendidos: c.atendidos,
          mql: c.mql,
          reunioes: c.reunioes,
          propostas: c.propostas,
          fechados: c.fechados,
          valorEmVendas: c.valorEmVendas,
          leadsDescartados: c.leadsDescartados,
        },
      })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return NextResponse.json({
    success: true,
    copied: { traffic: isDiretor(session.user.role), commercial: sourceCommercials.length },
  });
}

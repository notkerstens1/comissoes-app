import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isDiretor } from "@/lib/roles";

// GET - Buscar dados de um dia especifico (trafego + comercial + vendedores)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Parametro 'date' obrigatorio" }, { status: 400 });
  }

  const [traffic, commercials, vendors] = await Promise.all([
    prisma.dailyTraffic.findUnique({ where: { data: date } }),
    prisma.dailyCommercial.findMany({
      where: { data: date },
      include: { vendedor: { select: { id: true, nome: true, email: true } } },
      orderBy: { vendedor: { nome: "asc" } },
    }),
    prisma.user.findMany({
      where: { role: "VENDEDOR", ativo: true },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return NextResponse.json({ traffic, commercials, vendors });
}

// PUT - Salvar dados de um dia (trafego + comercial) atomicamente
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { date, traffic, commercials } = body;

  if (!date) {
    return NextResponse.json({ error: "Campo 'date' obrigatorio" }, { status: 400 });
  }

  const operations: any[] = [];

  // Trafego: somente DIRETOR pode editar
  if (traffic && isDiretor(session.user.role)) {
    operations.push(
      prisma.dailyTraffic.upsert({
        where: { data: date },
        update: {
          pessoasAlcancadas: traffic.pessoasAlcancadas ?? 0,
          totalLeads: traffic.totalLeads ?? 0,
          valorInvestidoVendas: traffic.valorInvestidoVendas ?? 0,
          valorInvestidoBranding: traffic.valorInvestidoBranding ?? 0,
          valorGasto: traffic.valorGasto ?? 0,
        },
        create: {
          data: date,
          pessoasAlcancadas: traffic.pessoasAlcancadas ?? 0,
          totalLeads: traffic.totalLeads ?? 0,
          valorInvestidoVendas: traffic.valorInvestidoVendas ?? 0,
          valorInvestidoBranding: traffic.valorInvestidoBranding ?? 0,
          valorGasto: traffic.valorGasto ?? 0,
        },
      })
    );
  }

  // Comercial: ADMIN e DIRETOR podem editar
  if (commercials && Array.isArray(commercials)) {
    for (const c of commercials) {
      if (!c.vendedorId) continue;
      operations.push(
        prisma.dailyCommercial.upsert({
          where: {
            data_vendedorId: { data: date, vendedorId: c.vendedorId },
          },
          update: {
            atendidos: c.atendidos ?? 0,
            mql: c.mql ?? 0,
            reunioes: c.reunioes ?? 0,
            propostas: c.propostas ?? 0,
            fechados: c.fechados ?? 0,
            valorEmVendas: c.valorEmVendas ?? 0,
            leadsDescartados: c.leadsDescartados ?? 0,
          },
          create: {
            data: date,
            vendedorId: c.vendedorId,
            atendidos: c.atendidos ?? 0,
            mql: c.mql ?? 0,
            reunioes: c.reunioes ?? 0,
            propostas: c.propostas ?? 0,
            fechados: c.fechados ?? 0,
            valorEmVendas: c.valorEmVendas ?? 0,
            leadsDescartados: c.leadsDescartados ?? 0,
          },
        })
      );
    }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return NextResponse.json({ success: true });
}

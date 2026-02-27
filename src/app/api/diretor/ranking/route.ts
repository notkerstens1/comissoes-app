import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET - Ranking de vendedores do mes
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") || getCurrentMonth();

  // Buscar configuracao (inclui meta)
  const config = await prisma.configuracao.findFirst();
  const metaVendasMes = config?.metaVendasMes ?? 120000;
  const metaMargemMedia = config?.metaMargemMedia ?? 1.8;

  // Buscar todos vendedores ativos (VENDEDOR e VENDEDOR_EXTERNO)
  const vendedores = await prisma.user.findMany({
    where: {
      role: { in: ["VENDEDOR", "VENDEDOR_EXTERNO"] },
      ativo: true
    },
    select: { id: true, nome: true, email: true },
  });

  // Buscar todas vendas do mes
  const vendas = await prisma.venda.findMany({
    where: { mesReferencia: mes },
  });

  // Agrupar por vendedor
  const ranking = vendedores.map((vendedor) => {
    const vendasDoVendedor = vendas.filter((v) => v.vendedorId === vendedor.id);
    const totalVendido = vendasDoVendedor.reduce((s, v) => s + v.valorVenda, 0);
    const comissaoTotal = vendasDoVendedor.reduce((s, v) => s + v.comissaoTotal, 0);
    const margemMedia = vendasDoVendedor.length > 0
      ? vendasDoVendedor.reduce((s, v) => s + v.margem, 0) / vendasDoVendedor.length
      : 0;
    const lucroTotal = vendasDoVendedor.reduce((s, v) => s + (v.lucroLiquido ?? 0), 0);
    const margemLucroMedia = totalVendido > 0 ? lucroTotal / totalVendido : 0;

    return {
      id: vendedor.id,
      nome: vendedor.nome,
      email: vendedor.email,
      totalVendido,
      quantidadeVendas: vendasDoVendedor.length,
      comissaoTotal,
      margemMedia,
      lucroTotal,
      margemLucroMedia,
      ticketMedio: vendasDoVendedor.length > 0 ? totalVendido / vendasDoVendedor.length : 0,
      // Progresso da meta
      progressoMeta: metaVendasMes > 0 ? (totalVendido / metaVendasMes) * 100 : 0,
    };
  });

  // Ordenar por total vendido (maior primeiro)
  ranking.sort((a, b) => b.totalVendido - a.totalVendido);

  // Adicionar posicao
  const rankingComPosicao = ranking.map((r, i) => ({
    posicao: i + 1,
    ...r,
  }));

  const totalGeralVendido = ranking.reduce((s, r) => s + r.totalVendido, 0);
  const qtdVendedoresAtivos = vendedores.length;
  const metaTime = metaVendasMes * qtdVendedoresAtivos;
  const progressoTime = metaTime > 0 ? (totalGeralVendido / metaTime) * 100 : 0;

  return NextResponse.json({
    mes,
    ranking: rankingComPosicao,
    totais: {
      totalGeralVendido,
      totalGeralComissao: ranking.reduce((s, r) => s + r.comissaoTotal, 0),
      totalGeralVendas: ranking.reduce((s, r) => s + r.quantidadeVendas, 0),
    },
    meta: {
      metaVendasMes,
      metaMargemMedia,
      metaTime,
      progressoTime,
      qtdVendedores: qtdVendedoresAtivos,
    },
  });
}

// PUT - Atualizar meta (admin/diretor)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { metaVendasMes, metaMargemMedia } = body;

  const updateData: any = {};
  if (metaVendasMes !== undefined) updateData.metaVendasMes = metaVendasMes;
  if (metaMargemMedia !== undefined) updateData.metaMargemMedia = metaMargemMedia;

  await prisma.configuracao.upsert({
    where: { id: "config_principal" },
    update: updateData,
    create: {
      id: "config_principal",
      ...updateData,
    },
  });

  return NextResponse.json({ ok: true });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

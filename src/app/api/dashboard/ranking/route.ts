import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekRange } from "@/lib/dates";

// GET - Ranking de vendedores por date range (todos os roles)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const defaultRange = getCurrentWeekRange();
  const inicio = searchParams.get("inicio") || defaultRange.start;
  const fim = searchParams.get("fim") || defaultRange.end;

  // Buscar todos vendedores ativos (VENDEDOR e VENDEDOR_EXTERNO)
  const vendedores = await prisma.user.findMany({
    where: {
      role: { in: ["VENDEDOR", "VENDEDOR_EXTERNO"] },
      ativo: true
    },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  // Buscar vendas no range de datas usando dataConversao
  const vendas = await prisma.venda.findMany({
    where: {
      dataConversao: {
        gte: new Date(inicio + "T00:00:00"),
        lte: new Date(fim + "T23:59:59"),
      },
    },
    select: {
      vendedorId: true,
      valorVenda: true,
      margem: true,
    },
  });

  // Agrupar por vendedor
  const ranking = vendedores.map((vendedor) => {
    const vendasDoVendedor = vendas.filter((v) => v.vendedorId === vendedor.id);
    const totalVendido = vendasDoVendedor.reduce((s, v) => s + v.valorVenda, 0);
    const qtdVendas = vendasDoVendedor.length;
    const ticketMedio = qtdVendas > 0 ? totalVendido / qtdVendas : 0;
    const margemMedia =
      qtdVendas > 0
        ? vendasDoVendedor.reduce((s, v) => s + v.margem, 0) / qtdVendas
        : 0;

    return {
      id: vendedor.id,
      nome: vendedor.nome,
      totalVendido,
      qtdVendas,
      ticketMedio,
      margemMedia,
    };
  });

  // Ordenar por total vendido (maior primeiro)
  ranking.sort((a, b) => b.totalVendido - a.totalVendido);

  // Adicionar posicao
  const rankingComPosicao = ranking.map((r, i) => ({
    posicao: i + 1,
    ...r,
  }));

  // Calcular badges especiais (somente entre vendedores com pelo menos 1 venda)
  const comVendas = ranking.filter((r) => r.qtdVendas > 0);

  let melhorMargem: { id: string; nome: string; valor: number } | null = null;
  let maiorTicket: { id: string; nome: string; valor: number } | null = null;

  if (comVendas.length > 0) {
    const melhorMargemVendedor = comVendas.reduce((best, r) =>
      r.margemMedia > best.margemMedia ? r : best
    );
    melhorMargem = {
      id: melhorMargemVendedor.id,
      nome: melhorMargemVendedor.nome,
      valor: melhorMargemVendedor.margemMedia,
    };

    const maiorTicketVendedor = comVendas.reduce((best, r) =>
      r.ticketMedio > best.ticketMedio ? r : best
    );
    maiorTicket = {
      id: maiorTicketVendedor.id,
      nome: maiorTicketVendedor.nome,
      valor: maiorTicketVendedor.ticketMedio,
    };
  }

  return NextResponse.json({
    inicio,
    fim,
    ranking: rankingComPosicao,
    badges: {
      melhorMargem,
      maiorTicket,
    },
    totais: {
      totalGeralVendido: ranking.reduce((s, r) => s + r.totalVendido, 0),
      totalGeralVendas: ranking.reduce((s, r) => s + r.qtdVendas, 0),
    },
  });
}

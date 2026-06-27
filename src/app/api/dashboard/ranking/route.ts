import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekRange, getNow } from "@/lib/dates";
import { ROLES_VENDEDOR_TIME } from "@/lib/roles";
import { buildDashboardRanking } from "@/lib/ranking";

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
      role: { in: [...ROLES_VENDEDOR_TIME] },
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

  // Buscar meta de vendas da configuração.
  // "Meta batida" no dashboard conta por QUANTIDADE de vendas/mês por vendedor
  // (não por receita). Valor em R$ (metaVendasMes) é usado no painel do diretor.
  const config = await prisma.configuracao.findFirst();
  const meta = config?.metaVendasQtdMes ?? 8;

  // Calcular ranking e totais via helper
  const { ranking, totais } = buildDashboardRanking(
    vendedores.map((v) => ({ id: v.id, nome: v.nome })),
    vendas.map((v) => ({ vendedorId: v.vendedorId, valorVenda: v.valorVenda, margem: v.margem })),
    meta,
  );

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
    geradoEm: getNow().toISOString(),
    meta,
    ranking,
    badges: { melhorMargem, maiorTicket },
    totais,
  });
}

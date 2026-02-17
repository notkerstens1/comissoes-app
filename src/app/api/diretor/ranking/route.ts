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

  // Buscar todos vendedores ativos
  const vendedores = await prisma.user.findMany({
    where: { role: "VENDEDOR", ativo: true },
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
    };
  });

  // Ordenar por total vendido (maior primeiro)
  ranking.sort((a, b) => b.totalVendido - a.totalVendido);

  // Adicionar posicao
  const rankingComPosicao = ranking.map((r, i) => ({
    posicao: i + 1,
    ...r,
  }));

  return NextResponse.json({
    mes,
    ranking: rankingComPosicao,
    totais: {
      totalGeralVendido: ranking.reduce((s, r) => s + r.totalVendido, 0),
      totalGeralComissao: ranking.reduce((s, r) => s + r.comissaoTotal, 0),
      totalGeralVendas: ranking.reduce((s, r) => s + r.quantidadeVendas, 0),
    },
  });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

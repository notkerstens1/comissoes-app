import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Resumo geral do time (acessivel por TODOS os roles)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const mes = searchParams.get("mes") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Buscar todos vendedores ativos
  const vendedores = await prisma.user.findMany({
    where: { role: "VENDEDOR", ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  // Buscar todas as vendas do mes
  const vendas = await prisma.venda.findMany({
    where: { mesReferencia: mes },
    select: {
      vendedorId: true,
      valorVenda: true,
    },
  });

  // Agrupar por vendedor
  const vendasPorVendedor = new Map<string, { totalVendido: number; qtdVendas: number }>();
  for (const v of vendedores) {
    vendasPorVendedor.set(v.id, { totalVendido: 0, qtdVendas: 0 });
  }

  let totalGeralVendido = 0;
  let totalGeralVendas = 0;

  for (const venda of vendas) {
    const entry = vendasPorVendedor.get(venda.vendedorId);
    if (entry) {
      entry.totalVendido += venda.valorVenda;
      entry.qtdVendas += 1;
    }
    totalGeralVendido += venda.valorVenda;
    totalGeralVendas += 1;
  }

  const porVendedor = vendedores.map((v) => {
    const dados = vendasPorVendedor.get(v.id) || { totalVendido: 0, qtdVendas: 0 };
    return {
      id: v.id,
      nome: v.nome,
      totalVendido: dados.totalVendido,
      qtdVendas: dados.qtdVendas,
    };
  });

  return NextResponse.json({
    mes,
    totalGeralVendido,
    totalGeralVendas,
    porVendedor,
  });
}

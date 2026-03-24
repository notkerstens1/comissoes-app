import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vendas/excecoes?vendedorId=X&mes=YYYY-MM
 * Retorna quantas exceções o vendedor já usou no mês.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vendedorId = searchParams.get("vendedorId");
  const mes = searchParams.get("mes");

  if (!vendedorId || !mes) {
    return NextResponse.json({ error: "vendedorId e mes sao obrigatorios" }, { status: 400 });
  }

  const count = await prisma.venda.count({
    where: {
      vendedorId,
      mesReferencia: mes,
      excecao: true,
    },
  });

  return NextResponse.json({ count, limite: 2 });
}

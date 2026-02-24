import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes"); // "2026-01" — opcional

  const where: Record<string, unknown> = { vendedorId: session.user.id };
  if (mes) where.mesReferencia = mes;

  const simulacoes = await prisma.simulacaoVenda.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(simulacoes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    valorVenda,
    custoEquipamentos,
    kwp,
    quantidadePlacas,
    quantidadeInversores,
    ehExcecao,
    margemVendedor,
    over,
    lucroLiquido,
    margemEmpresa,
    custoTotal,
    vendaSaudavel,
  } = body;

  const now = new Date();
  const mesReferencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const simulacao = await prisma.simulacaoVenda.create({
    data: {
      vendedorId: session.user.id,
      valorVenda: Number(valorVenda),
      custoEquipamentos: Number(custoEquipamentos),
      kwp: Number(kwp) || 0,
      quantidadePlacas: Number(quantidadePlacas) || 0,
      quantidadeInversores: Number(quantidadeInversores) || 1,
      ehExcecao: Boolean(ehExcecao),
      margemVendedor: Number(margemVendedor),
      over: Number(over),
      lucroLiquido: Number(lucroLiquido),
      margemEmpresa: Number(margemEmpresa),
      custoTotal: Number(custoTotal),
      vendaSaudavel: Boolean(vendaSaudavel),
      mesReferencia,
    },
  });

  return NextResponse.json(simulacao, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET - Listar faixas de comissão
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const faixas = await prisma.faixaComissao.findMany({
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(faixas);
}

// PUT - Atualizar faixas (apenas admin)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { faixas } = body;

  // Deletar faixas existentes e recriar
  await prisma.faixaComissao.deleteMany();

  const novasFaixas = await Promise.all(
    faixas.map((f: any, i: number) =>
      prisma.faixaComissao.create({
        data: {
          ordem: i + 1,
          volumeMinimo: f.volumeMinimo,
          volumeMaximo: f.volumeMaximo || null,
          percentualOver: f.percentualOver,
          ativa: f.ativa ?? true,
        },
      })
    )
  );

  return NextResponse.json(novasFaixas);
}

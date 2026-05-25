import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET — lista todos os precos de material
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const precos = await prisma.precoMaterial.findMany({
    orderBy: { chave: "asc" },
  });
  return NextResponse.json(precos);
}

// PUT — atualiza preco unitario (e/ou ativo). Identificado por chave.
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const { chave, precoUnit, ativo } = body;

  if (!chave) {
    return NextResponse.json({ error: "chave obrigatoria" }, { status: 400 });
  }

  const updated = await prisma.precoMaterial.update({
    where: { chave },
    data: {
      ...(precoUnit !== undefined && { precoUnit: parseFloat(precoUnit) }),
      ...(ativo !== undefined && { ativo: !!ativo }),
    },
  });

  return NextResponse.json(updated);
}

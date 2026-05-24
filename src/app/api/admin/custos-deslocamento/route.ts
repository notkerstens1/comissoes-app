import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET — lista todos os custos de deslocamento por cidade
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const custos = await prisma.custoDeslocamento.findMany({
    orderBy: { cidade: "asc" },
  });
  return NextResponse.json(custos);
}

// POST — cria nova cidade
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { cidade, valor } = await request.json();
  if (!cidade || valor === undefined) {
    return NextResponse.json({ error: "cidade e valor obrigatorios" }, { status: 400 });
  }

  const created = await prisma.custoDeslocamento.create({
    data: { cidade: cidade.trim(), valor: parseFloat(valor) },
  });
  return NextResponse.json(created);
}

// PUT — atualiza valor de uma cidade existente
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { cidade, valor } = await request.json();
  if (!cidade || valor === undefined) {
    return NextResponse.json({ error: "cidade e valor obrigatorios" }, { status: 400 });
  }

  const updated = await prisma.custoDeslocamento.update({
    where: { cidade },
    data: { valor: parseFloat(valor) },
  });
  return NextResponse.json(updated);
}

// DELETE — remove cidade
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cidade = searchParams.get("cidade");
  if (!cidade) return NextResponse.json({ error: "cidade obrigatoria" }, { status: 400 });

  await prisma.custoDeslocamento.delete({ where: { cidade } });
  return NextResponse.json({ ok: true });
}

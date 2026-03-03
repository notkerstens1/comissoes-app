import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notificacoes
 * Retorna notificacoes nao lidas do usuario logado.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const notificacoes = await prisma.notificacao.findMany({
    where: { userId: session.user.id, lida: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notificacoes);
}

/**
 * PUT /api/notificacoes
 * Marca notificacao como lida.
 * Body: { id: string } ou { marcarTodas: true }
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { id, marcarTodas } = body;

  if (marcarTodas) {
    await prisma.notificacao.updateMany({
      where: { userId: session.user.id, lida: false },
      data: { lida: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  }

  // Verificar que a notificacao pertence ao usuario
  const notif = await prisma.notificacao.findUnique({ where: { id } });
  if (!notif || notif.userId !== session.user.id) {
    return NextResponse.json({ error: "Notificacao nao encontrada" }, { status: 404 });
  }

  await prisma.notificacao.update({
    where: { id },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";

type Comentario = {
  id: string;
  autor: string;
  texto: string;
  criadoEm: string;
};

function parseComentarios(raw: string | null): Comentario[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// DELETE — remove comentario por id (server-side, sem race)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; comentarioId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    select: { comentarios: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const atuais = parseComentarios(registro.comentarios);
  const filtrados = atuais.filter((c) => c.id !== params.comentarioId);

  if (filtrados.length === atuais.length) {
    return NextResponse.json({ error: "Comentario nao encontrado" }, { status: 404 });
  }

  await prisma.setorTecnico.update({
    where: { id: params.id },
    data: { comentarios: JSON.stringify(filtrados) },
  });

  return NextResponse.json({ ok: true, total: filtrados.length });
}

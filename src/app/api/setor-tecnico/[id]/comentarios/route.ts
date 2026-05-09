import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";
import { randomUUID } from "crypto";

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

// POST — adicionar comentario com append server-side (sem race com cliente)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json({ error: "Texto obrigatorio" }, { status: 400 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    select: { comentarios: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const atuais = parseComentarios(registro.comentarios);
  const novo: Comentario = {
    id: randomUUID(),
    autor: session.user.name || "Engenheiro",
    texto,
    criadoEm: new Date().toISOString(),
  };
  const atualizados = [...atuais, novo];

  await prisma.setorTecnico.update({
    where: { id: params.id },
    data: { comentarios: JSON.stringify(atualizados) },
  });

  return NextResponse.json({ ok: true, comentario: novo, total: atualizados.length });
}

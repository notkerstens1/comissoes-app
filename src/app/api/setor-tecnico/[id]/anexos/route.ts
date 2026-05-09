import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";

type Anexo = {
  nome: string;
  url: string;
  data: string;
};

function parseAnexos(raw: string | null): Anexo[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// POST — adiciona anexo com append server-side (sem race com cliente)
// Body: { nome: string, url: string }  // url normalmente eh data: base64
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
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const url = typeof body?.url === "string" ? body.url : "";
  if (!nome || !url) {
    return NextResponse.json({ error: "Nome e url obrigatorios" }, { status: 400 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    select: { anexos: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const atuais = parseAnexos(registro.anexos);
  const novo: Anexo = { nome, url, data: new Date().toISOString() };
  const atualizados = [...atuais, novo];

  await prisma.setorTecnico.update({
    where: { id: params.id },
    data: { anexos: JSON.stringify(atualizados) },
  });

  return NextResponse.json({ ok: true, anexo: novo, total: atualizados.length });
}

// DELETE — remove anexo identificado por nome+data no body (server-side, sem race)
// Body: { nome: string, data: string }
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const nome = typeof body?.nome === "string" ? body.nome : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (!nome || !data) {
    return NextResponse.json({ error: "nome e data obrigatorios" }, { status: 400 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    select: { anexos: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const atuais = parseAnexos(registro.anexos);
  const filtrados = atuais.filter((a) => !(a.nome === nome && a.data === data));

  if (filtrados.length === atuais.length) {
    return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });
  }

  await prisma.setorTecnico.update({
    where: { id: params.id },
    data: { anexos: JSON.stringify(filtrados) },
  });

  return NextResponse.json({ ok: true, total: filtrados.length });
}

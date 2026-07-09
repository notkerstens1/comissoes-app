import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isPosVenda } from "@/lib/roles";
import { isEtiquetaValida, parseEtiquetas } from "@/lib/etiquetas";

// POST — adiciona ou remove UMA etiqueta com toggle server-side (sem race com
// cliente). Body: { key: EtiquetaKey, action?: "add" | "remove" }.
// Segue o mesmo padrao dos comentarios: array mutado no servidor, nunca enviado
// inteiro pelo cliente (o PUT generico rejeita arrays de proposito).
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key : "";
  const action = body?.action === "remove" ? "remove" : "add";
  if (!isEtiquetaValida(key)) {
    return NextResponse.json({ error: "Etiqueta invalida" }, { status: 400 });
  }

  const registro = await prisma.posVenda.findUnique({
    where: { id: params.id },
    select: { etiquetas: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const atuais = parseEtiquetas(registro.etiquetas);
  const novas =
    action === "add"
      ? atuais.includes(key as never)
        ? atuais
        : [...atuais, key]
      : atuais.filter((k) => k !== key);

  await prisma.posVenda.update({
    where: { id: params.id },
    data: { etiquetas: JSON.stringify(novas) },
  });

  return NextResponse.json({ ok: true, etiquetas: novas });
}

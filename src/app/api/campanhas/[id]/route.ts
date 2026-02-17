import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET - Buscar campanha por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const campanha = await prisma.campanha.findUnique({
    where: { id: params.id },
    include: {
      criadoPor: { select: { nome: true } },
    },
  });

  if (!campanha) {
    return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });
  }

  return NextResponse.json(campanha);
}

// PUT - Editar campanha (ADMIN/DIRETOR only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { titulo, descricao, tipo, escopo, meta, dataInicio, dataFim, ativa } = body;

    // Verificar se existe
    const existente = await prisma.campanha.findUnique({
      where: { id: params.id },
    });
    if (!existente) {
      return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });
    }

    // Validacoes
    if (tipo && !["VALOR", "QUANTIDADE"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo deve ser VALOR ou QUANTIDADE" }, { status: 400 });
    }
    if (escopo && !["TIME", "INDIVIDUAL"].includes(escopo)) {
      return NextResponse.json({ error: "Escopo deve ser TIME ou INDIVIDUAL" }, { status: 400 });
    }
    if (meta !== undefined && meta <= 0) {
      return NextResponse.json({ error: "Meta deve ser maior que zero" }, { status: 400 });
    }
    const finalInicio = dataInicio || existente.dataInicio;
    const finalFim = dataFim || existente.dataFim;
    if (finalFim < finalInicio) {
      return NextResponse.json({ error: "Data fim deve ser >= data inicio" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (titulo !== undefined) updateData.titulo = titulo.trim();
    if (descricao !== undefined) updateData.descricao = descricao?.trim() || null;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (escopo !== undefined) updateData.escopo = escopo;
    if (meta !== undefined) updateData.meta = Number(meta);
    if (dataInicio !== undefined) updateData.dataInicio = dataInicio;
    if (dataFim !== undefined) updateData.dataFim = dataFim;
    if (ativa !== undefined) updateData.ativa = Boolean(ativa);

    const campanha = await prisma.campanha.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(campanha);
  } catch (error) {
    console.error("Erro ao atualizar campanha:", error);
    return NextResponse.json({ error: "Erro ao atualizar campanha" }, { status: 500 });
  }
}

// DELETE - Excluir campanha (ADMIN/DIRETOR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    await prisma.campanha.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir campanha:", error);
    return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });
  }
}

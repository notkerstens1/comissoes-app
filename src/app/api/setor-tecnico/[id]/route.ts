import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";

// GET — buscar registro completo (com campos pesados) sob demanda
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    include: {
      venda: { select: { id: true, cliente: true, valorVenda: true, kwp: true, quantidadePlacas: true } },
    },
  });

  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  return NextResponse.json(registro);
}

// PUT — atualizar registro do setor tecnico
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const body = await request.json();
  const { nomeCliente, telefone, email, etapa, observacoes, ultimaAcao, proximaAcao, anexos, comentarios } = body;

  const data: any = {};

  if (nomeCliente !== undefined) data.nomeCliente = nomeCliente.trim();
  if (telefone !== undefined) data.telefone = telefone?.trim() || null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (etapa !== undefined) data.etapa = etapa;
  if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null;
  if (ultimaAcao !== undefined) data.ultimaAcao = ultimaAcao?.trim() || null;
  if (anexos !== undefined) data.anexos = anexos;
  if (comentarios !== undefined) data.comentarios = comentarios;

  // Historico de acoes: ao atualizar proximaAcao, salvar a anterior no historico
  if (proximaAcao !== undefined) {
    const acaoAnterior = registro.proximaAcao;
    if (acaoAnterior) {
      const hoje = new Date().toISOString().split("T")[0];
      const historicoAtual: { data: string; acao: string }[] = registro.historicoAcoes
        ? JSON.parse(registro.historicoAcoes)
        : [];
      historicoAtual.push({ data: hoje, acao: acaoAnterior });
      data.historicoAcoes = JSON.stringify(historicoAtual);
    }
    data.proximaAcao = proximaAcao?.trim() || null;
  }

  const updated = await prisma.setorTecnico.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE — arquivar (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  await prisma.setorTecnico.update({
    where: { id: params.id },
    data: { ativo: false },
  });

  return NextResponse.json({ ok: true });
}

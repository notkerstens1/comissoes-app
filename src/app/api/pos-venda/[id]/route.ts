import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isPosVenda } from "@/lib/roles";

// PUT — atualizar registro de pos venda
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.posVenda.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  // Operador so pode editar seus proprios registros
  if (!isAdmin(role) && registro.operadorId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = await request.json();
  const {
    nomeCliente,
    telefone,
    etapa,
    ultimaAcao,
    proximaAcao,
    observacoes,
    ultimoContato,
    proximoContato,
  } = body;

  const updated = await prisma.posVenda.update({
    where: { id: params.id },
    data: {
      ...(nomeCliente !== undefined && { nomeCliente: nomeCliente.trim() }),
      ...(telefone !== undefined && { telefone: telefone?.trim() || null }),
      ...(etapa !== undefined && { etapa }),
      ...(ultimaAcao !== undefined && { ultimaAcao: ultimaAcao?.trim() || null }),
      ...(proximaAcao !== undefined && { proximaAcao: proximaAcao?.trim() || null }),
      ...(observacoes !== undefined && { observacoes: observacoes?.trim() || null }),
      ...(ultimoContato !== undefined && { ultimoContato: ultimoContato || null }),
      ...(proximoContato !== undefined && { proximoContato: proximoContato || null }),
    },
    include: {
      operador: { select: { id: true, nome: true } },
    },
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

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.posVenda.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  if (!isAdmin(role) && registro.operadorId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  await prisma.posVenda.update({
    where: { id: params.id },
    data: { ativo: false },
  });

  return NextResponse.json({ ok: true });
}

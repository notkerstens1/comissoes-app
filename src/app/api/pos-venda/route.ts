import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isPosVenda } from "@/lib/roles";

// GET — listar registros de pos venda
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registros = await prisma.posVenda.findMany({
    where: { ativo: true },
    include: {
      operador: { select: { id: true, nome: true } },
      venda: { select: { id: true, cliente: true, valorVenda: true } },
    },
    orderBy: { proximoContato: "asc" },
  });

  return NextResponse.json(registros);
}

// POST — criar novo registro de pos venda
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
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
    vendaId,
  } = body;

  if (!nomeCliente) {
    return NextResponse.json({ error: "Nome do cliente obrigatorio" }, { status: 400 });
  }

  const registro = await prisma.posVenda.create({
    data: {
      operadorId: session.user.id,
      nomeCliente: nomeCliente.trim(),
      telefone: telefone?.trim() || null,
      etapa: etapa || "TRAMITES",
      ultimaAcao: ultimaAcao?.trim() || null,
      proximaAcao: proximaAcao?.trim() || null,
      observacoes: observacoes?.trim() || null,
      ultimoContato: ultimoContato || null,
      proximoContato: proximoContato || null,
      vendaId: vendaId || null,
    },
    include: {
      operador: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(registro, { status: 201 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";

// GET — listar registros do setor tecnico
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registros = await prisma.setorTecnico.findMany({
    where: { ativo: true },
    include: {
      venda: { select: { id: true, cliente: true, valorVenda: true, kwp: true, quantidadePlacas: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(registros);
}

// POST — criar novo registro no setor tecnico
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { nomeCliente, telefone, email, etapa, observacoes, vendaId, vendedorNome } = body;

  if (!nomeCliente) {
    return NextResponse.json({ error: "Nome do cliente obrigatorio" }, { status: 400 });
  }

  const registro = await prisma.setorTecnico.create({
    data: {
      nomeCliente: nomeCliente.trim(),
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      etapa: etapa || "NOVO_PROJETO",
      observacoes: observacoes?.trim() || null,
      vendaId: vendaId || null,
      vendedorNome: vendedorNome?.trim() || null,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}

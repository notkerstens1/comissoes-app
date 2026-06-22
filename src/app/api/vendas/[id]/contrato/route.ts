import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupervisor } from "@/lib/roles";

// PATCH - Atualizar apenas o status do contrato de uma venda.
// Acao leve, separada do PUT pesado (que recalcula comissoes/custos e e
// restrito a ADMIN/DIRETOR/FINANCEIRO). Aqui a permissao e mais ampla:
// o proprio vendedor dono da venda pode finalizar, alem de supervisor/diretor.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const venda = await prisma.venda.findUnique({
    where: { id: params.id },
    select: { id: true, vendedorId: true },
  });

  if (!venda) {
    return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
  }

  // isSupervisor cobre SUPERVISOR, ADMIN e DIRETOR. O dono da venda tambem pode.
  const podeEditar =
    isSupervisor(session.user.role) || venda.vendedorId === session.user.id;
  if (!podeEditar) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = await request.json();
  const { statusContrato } = body;

  if (statusContrato !== "COMPLETO" && statusContrato !== "A_FINALIZAR") {
    return NextResponse.json(
      { error: "statusContrato invalido (COMPLETO ou A_FINALIZAR)" },
      { status: 400 }
    );
  }

  const atualizada = await prisma.venda.update({
    where: { id: params.id },
    data: {
      statusContrato,
      // Carimba a data quando finaliza; limpa ao reabrir.
      dataFinalizacaoContrato: statusContrato === "COMPLETO" ? new Date() : null,
    },
  });

  return NextResponse.json(atualizada);
}

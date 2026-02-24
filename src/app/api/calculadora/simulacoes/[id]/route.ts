import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Só pode deletar sua própria simulação
  const simulacao = await prisma.simulacaoVenda.findUnique({ where: { id: params.id } });
  if (!simulacao || simulacao.vendedorId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.simulacaoVenda.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

// GET - Listar solicitações de ajuste de margem (apenas DIRETOR)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const solicitacoes = await prisma.solicitacaoMargem.findMany({
    where: { status: "AGUARDANDO" },
    include: {
      solicitante: { select: { nome: true } },
      venda: { select: { valorVenda: true, mesReferencia: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(solicitacoes);
}

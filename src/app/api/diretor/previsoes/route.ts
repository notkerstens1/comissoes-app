import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET — listar previsoes de material e instalacao (visao diretor)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registros = await prisma.posVenda.findMany({
    where: {
      ativo: true,
      OR: [
        { previsaoMaterial: { not: null } },
        { previsaoInstalacao: { not: null } },
      ],
    },
    select: {
      id: true,
      nomeCliente: true,
      telefone: true,
      etapa: true,
      previsaoMaterial: true,
      previsaoInstalacao: true,
      operador: { select: { nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(registros);
}

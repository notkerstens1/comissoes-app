import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { isAdmin } from "@/lib/roles";

// PUT - Atualizar vendedor (ativar/desativar, alterar dados)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { nome, email, senha, role, ativo } = body;

  const updateData: any = {};
  if (nome !== undefined) updateData.nome = nome;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (ativo !== undefined) updateData.ativo = ativo;
  if (senha) updateData.senha = await hash(senha, 12);

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
    },
  });

  return NextResponse.json(user);
}

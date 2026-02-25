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

// DELETE - Excluir usuário migrando todos os dados para outro usuário
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = params;

  // Nao pode deletar a si mesmo
  if (id === session.user.id) {
    return NextResponse.json({ error: "Nao e possivel excluir sua propria conta" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { migrarParaId } = body;

  if (!migrarParaId) {
    return NextResponse.json({ error: "Selecione um usuario para receber os dados" }, { status: 400 });
  }

  // Verificar que ambos existem
  const [userParaDeletar, userDestino] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: migrarParaId } }),
  ]);

  if (!userParaDeletar) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  if (!userDestino) return NextResponse.json({ error: "Usuario destino nao encontrado" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Migrar vendas
      await tx.venda.updateMany({ where: { vendedorId: id }, data: { vendedorId: migrarParaId } });

      // Migrar registros SDR (como SDR)
      await tx.registroSDR.updateMany({ where: { sdrId: id }, data: { sdrId: migrarParaId } });
      // Migrar registros SDR (como vendedora)
      await tx.registroSDR.updateMany({ where: { vendedoraId: id }, data: { vendedoraId: migrarParaId } });
      // Migrar registros SDR pagos pelo usuário
      await tx.registroSDR.updateMany({ where: { pagoPorId: id }, data: { pagoPorId: migrarParaId } });

      // Migrar pendências resolvidas pelo usuário
      await tx.pendenciaVinculo.updateMany({ where: { resolvidoPorId: id }, data: { resolvidoPorId: migrarParaId } });

      // Migrar registros de Pós Venda
      await tx.posVenda.updateMany({ where: { operadorId: id }, data: { operadorId: migrarParaId } });

      // Migrar campanhas criadas
      await tx.campanha.updateMany({ where: { criadoPorId: id }, data: { criadoPorId: migrarParaId } });

      // Migrar daily commercials
      await tx.dailyCommercial.updateMany({ where: { vendedorId: id }, data: { vendedorId: migrarParaId } });

      // Migrar simulações da calculadora
      await tx.simulacaoVenda.updateMany({ where: { vendedorId: id }, data: { vendedorId: migrarParaId } });

      // Deletar o usuário
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro ao excluir usuario:", error);
    return NextResponse.json({ error: "Erro ao excluir: " + error.message }, { status: 500 });
  }
}

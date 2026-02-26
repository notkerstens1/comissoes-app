import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * Remove o usuário seed "Emelly" (emelly@solar.com) e migra
 * todos os seus dados para "Emily Alves" (@gmail.com).
 *
 * GET  → preview (mostra os dois usuários e o que será migrado)
 * POST → executa a migração e deleta emelly@solar.com
 */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const emelly = await prisma.user.findFirst({
    where: { email: "emelly@solar.com" },
    select: { id: true, nome: true, email: true, role: true },
  });

  const emilyAlves = await prisma.user.findFirst({
    where: {
      nome: { contains: "Emily Alves", mode: "insensitive" },
      email: { endsWith: "@gmail.com" },
    },
    select: { id: true, nome: true, email: true, role: true },
  });

  if (!emelly) {
    return NextResponse.json({ ok: true, mensagem: "emelly@solar.com nao encontrado — ja foi removido." });
  }
  if (!emilyAlves) {
    return NextResponse.json({ erro: "Nao foi encontrado nenhum usuario @gmail.com com nome 'Emily Alves'." }, { status: 404 });
  }

  const [sdrComoSDR, sdrComoVendedora, posVenda, campanhas, daily, simulacoes] = await Promise.all([
    prisma.registroSDR.count({ where: { sdrId: emelly.id } }),
    prisma.registroSDR.count({ where: { vendedoraId: emelly.id } }),
    prisma.posVenda.count({ where: { operadorId: emelly.id } }),
    prisma.campanha.count({ where: { criadoPorId: emelly.id } }).catch(() => 0),
    prisma.dailyCommercial.count({ where: { vendedorId: emelly.id } }).catch(() => 0),
    prisma.simulacaoVenda.count({ where: { vendedorId: emelly.id } }).catch(() => 0),
  ]);

  return NextResponse.json({
    emelly,
    emilyAlves,
    dadosParaMigrar: { sdrComoSDR, sdrComoVendedora, posVenda, campanhas, daily, simulacoes },
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const emelly = await prisma.user.findFirst({
    where: { email: "emelly@solar.com" },
    select: { id: true, nome: true, email: true },
  });

  if (!emelly) {
    return NextResponse.json({ ok: true, mensagem: "emelly@solar.com nao encontrado — ja foi removido." });
  }

  const emilyAlves = await prisma.user.findFirst({
    where: {
      nome: { contains: "Emily Alves", mode: "insensitive" },
      email: { endsWith: "@gmail.com" },
    },
    select: { id: true, nome: true, email: true },
  });

  if (!emilyAlves) {
    return NextResponse.json({ erro: "Nao foi encontrado nenhum usuario @gmail.com com nome 'Emily Alves'." }, { status: 404 });
  }

  const from = emelly.id;
  const to = emilyAlves.id;

  await prisma.$transaction(async (tx) => {
    await tx.venda.updateMany({ where: { vendedorId: from }, data: { vendedorId: to } });
    await tx.registroSDR.updateMany({ where: { sdrId: from }, data: { sdrId: to } });
    await tx.registroSDR.updateMany({ where: { vendedoraId: from }, data: { vendedoraId: to } });
    await tx.registroSDR.updateMany({ where: { pagoPorId: from }, data: { pagoPorId: to } });
    await tx.pendenciaVinculo.updateMany({ where: { resolvidoPorId: from }, data: { resolvidoPorId: to } });
    await tx.posVenda.updateMany({ where: { operadorId: from }, data: { operadorId: to } });
    await tx.campanha.updateMany({ where: { criadoPorId: from }, data: { criadoPorId: to } });
    await tx.dailyCommercial.updateMany({ where: { vendedorId: from }, data: { vendedorId: to } });
    await tx.simulacaoVenda.updateMany({ where: { vendedorId: from }, data: { vendedorId: to } });
    await tx.solicitacaoMargem.updateMany({ where: { solicitanteId: from }, data: { solicitanteId: to } });
    await tx.user.delete({ where: { id: from } });
  });

  return NextResponse.json({
    ok: true,
    mensagem: `Todos os dados de "${emelly.nome}" (${emelly.email}) foram migrados para "${emilyAlves.nome}" (${emilyAlves.email}) e o usuario seed foi removido.`,
  });
}

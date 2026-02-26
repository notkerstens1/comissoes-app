import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * Endpoint de emergência para remover os registros SDR seed
 * criados incorretamente em produção.
 *
 * Remove APENAS os registros com nomes de demo conhecidos:
 *   - Maria das Gracas Oliveira (AGENDADO falso)
 *   - Francisco Alves da Silva (COMPARECEU falso)
 *   - Jose Carlos Ferreira (FINALIZADO/CPF negada falso)
 *
 * E registros VENDIDO linkados a vendas de clientes que
 * NÃO devem ter vínculo SDR (Cilene e Nilsa — se foram
 * criados pelo seed e têm considerações exatas do seed).
 *
 * GET  → lista os registros que serão removidos (preview)
 * POST → executa a remoção
 */

const NOMES_SEED = [
  "Maria das Gracas Oliveira",
  "Francisco Alves da Silva",
  "Jose Carlos Ferreira",
];

const CONSIDERACOES_SEED = [
  "Cliente indicada por vizinha, ja sabia dos beneficios",
  "Cliente muito interessada, boa conversa sobre economia na conta de luz",
  "Cliente pediu para remarcar",
  "Cliente pediu proposta, aguardando retorno",
  "Cliente compareceu mas CPF negativado, sem condicoes",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // Registros pelos nomes de demo conhecidos
  const porNome = await prisma.registroSDR.findMany({
    where: { nomeCliente: { in: NOMES_SEED } },
    include: { sdr: { select: { nome: true } }, vendedora: { select: { nome: true } } },
  });

  // Registros pelas considerações exatas do seed
  const porConsideracoes = await prisma.registroSDR.findMany({
    where: { consideracoes: { in: CONSIDERACOES_SEED } },
    include: { sdr: { select: { nome: true } }, vendedora: { select: { nome: true } } },
  });

  // União por ID
  const todos = [...porNome, ...porConsideracoes];
  const unicos = Array.from(new Map(todos.map((r) => [r.id, r])).values());

  return NextResponse.json({
    total: unicos.length,
    registros: unicos.map((r) => ({
      id: r.id,
      nomeCliente: r.nomeCliente,
      dataReuniao: r.dataReuniao,
      statusLead: r.statusLead,
      sdr: r.sdr?.nome,
      vendedora: r.vendedora?.nome,
      consideracoes: r.consideracoes,
    })),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // Buscar IDs dos registros falsos
  const porNome = await prisma.registroSDR.findMany({
    where: { nomeCliente: { in: NOMES_SEED } },
    select: { id: true, nomeCliente: true },
  });

  const porConsideracoes = await prisma.registroSDR.findMany({
    where: { consideracoes: { in: CONSIDERACOES_SEED } },
    select: { id: true, nomeCliente: true },
  });

  const todos = [...porNome, ...porConsideracoes];
  const idsSet: Record<string, boolean> = {};
  todos.forEach((r) => { idsSet[r.id] = true; });
  const ids = Object.keys(idsSet);

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, removidos: 0, mensagem: "Nenhum registro seed encontrado." });
  }

  // Remover vínculos com vendas antes de deletar
  await prisma.registroSDR.updateMany({
    where: { id: { in: ids } },
    data: { vendaVinculadaId: null, dataVendaVinculada: null },
  });

  // Deletar
  const { count } = await prisma.registroSDR.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({
    ok: true,
    removidos: count,
    registros: todos.map((r) => r.nomeCliente),
  });
}

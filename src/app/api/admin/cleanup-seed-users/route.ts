import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * Endpoint de limpeza de usuários seed (@solar.com)
 *
 * GET  → preview: lista o que será feito (sem alterar nada)
 * POST → executa: deleta/migra os usuários seed
 *
 * Regras:
 * - Mantém daniel@solar.com (sempre)
 * - Mantém todos os @gmail.com
 * - Para cada @solar.com: tenta encontrar @gmail.com pelo nome (ilike)
 *   → se encontrou: migra todos os dados para o gmail e deleta o solar
 *   → se não encontrou + tem dados: skip (relata)
 *   → se não encontrou + sem dados: deleta diretamente
 */

const SEED_DOMAIN = "@solar.com";
const KEEP_EMAIL = "daniel@solar.com";

async function getUserCounts(userId: string) {
  const [vendas, sdrComoSDR, sdrComoVendedora, posVenda, campanhas, daily, simulacoes] =
    await Promise.all([
      prisma.venda.count({ where: { vendedorId: userId } }),
      prisma.registroSDR.count({ where: { sdrId: userId } }),
      prisma.registroSDR.count({ where: { vendedoraId: userId } }),
      prisma.posVenda.count({ where: { operadorId: userId } }),
      prisma.campanha.count({ where: { criadoPorId: userId } }),
      prisma.dailyCommercial.count({ where: { vendedorId: userId } }),
      prisma.simulacaoVenda.count({ where: { vendedorId: userId } }),
    ]);
  return { vendas, sdrComoSDR, sdrComoVendedora, posVenda, campanhas, daily, simulacoes };
}

function temDados(counts: Awaited<ReturnType<typeof getUserCounts>>) {
  return Object.values(counts).some((v) => v > 0);
}

// Extrai primeiro nome para comparação
function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0].toLowerCase();
}

// GET — preview sem alterar nada
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // Todos os usuários seed (exceto daniel)
  const seedUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: SEED_DOMAIN, not: KEEP_EMAIL },
    },
    select: { id: true, nome: true, email: true, role: true },
    orderBy: { nome: "asc" },
  });

  // Todos os usuários @gmail.com
  const gmailUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@gmail.com" } },
    select: { id: true, nome: true, email: true, role: true },
  });

  const plano = [];

  for (const seed of seedUsers) {
    const counts = await getUserCounts(seed.id);
    const hasDados = temDados(counts);

    // Tenta encontrar gmail com mesmo primeiro nome
    const matched = gmailUsers.find(
      (g) => primeiroNome(g.nome) === primeiroNome(seed.nome)
    );

    if (matched) {
      plano.push({
        usuario: seed,
        acao: "MIGRAR_E_DELETAR",
        migrarPara: matched,
        dados: counts,
      });
    } else if (!hasDados) {
      plano.push({
        usuario: seed,
        acao: "DELETAR_DIRETO",
        migrarPara: null,
        dados: counts,
      });
    } else {
      plano.push({
        usuario: seed,
        acao: "SKIP_TEM_DADOS_SEM_MATCH",
        migrarPara: null,
        dados: counts,
      });
    }
  }

  return NextResponse.json({
    seedUsers: seedUsers.length,
    gmailUsers: gmailUsers.map((g) => ({ id: g.id, nome: g.nome, email: g.email })),
    plano,
  });
}

// POST — executa a limpeza
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // Aceita sobrescritas manuais: { overrides: { "seed_user_id": "gmail_user_id" } }
  const body = await request.json().catch(() => ({}));
  const overrides: Record<string, string> = body.overrides ?? {};

  const seedUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: SEED_DOMAIN, not: KEEP_EMAIL },
    },
    select: { id: true, nome: true, email: true, role: true },
  });

  const gmailUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@gmail.com" } },
    select: { id: true, nome: true, email: true, role: true },
  });

  const resultado = [];

  for (const seed of seedUsers) {
    const counts = await getUserCounts(seed.id);
    const hasDados = temDados(counts);

    // Override manual tem prioridade
    const migrarParaId =
      overrides[seed.id] ??
      gmailUsers.find((g) => primeiroNome(g.nome) === primeiroNome(seed.nome))?.id ??
      null;

    try {
      if (migrarParaId) {
        // Migrar todos os dados e deletar
        await prisma.$transaction(async (tx) => {
          await tx.venda.updateMany({ where: { vendedorId: seed.id }, data: { vendedorId: migrarParaId } });
          await tx.registroSDR.updateMany({ where: { sdrId: seed.id }, data: { sdrId: migrarParaId } });
          await tx.registroSDR.updateMany({ where: { vendedoraId: seed.id }, data: { vendedoraId: migrarParaId } });
          await tx.registroSDR.updateMany({ where: { pagoPorId: seed.id }, data: { pagoPorId: migrarParaId } });
          await tx.pendenciaVinculo.updateMany({ where: { resolvidoPorId: seed.id }, data: { resolvidoPorId: migrarParaId } });
          await tx.posVenda.updateMany({ where: { operadorId: seed.id }, data: { operadorId: migrarParaId } });
          await tx.campanha.updateMany({ where: { criadoPorId: seed.id }, data: { criadoPorId: migrarParaId } });
          await tx.dailyCommercial.updateMany({ where: { vendedorId: seed.id }, data: { vendedorId: migrarParaId } });
          await tx.simulacaoVenda.updateMany({ where: { vendedorId: seed.id }, data: { vendedorId: migrarParaId } });
          await tx.solicitacaoMargem.updateMany({ where: { solicitanteId: seed.id }, data: { solicitanteId: migrarParaId } });
          await tx.user.delete({ where: { id: seed.id } });
        });

        resultado.push({
          email: seed.email,
          acao: "MIGRADO_E_DELETADO",
          migradoPara: gmailUsers.find((g) => g.id === migrarParaId)?.email,
          dados: counts,
        });
      } else if (!hasDados) {
        // Sem dados e sem match — deleta direto
        await prisma.user.delete({ where: { id: seed.id } });
        resultado.push({
          email: seed.email,
          acao: "DELETADO_DIRETO",
          migradoPara: null,
          dados: counts,
        });
      } else {
        // Tem dados mas sem match gmail — pula
        resultado.push({
          email: seed.email,
          acao: "SKIPPED_SEM_MATCH",
          migradoPara: null,
          dados: counts,
          aviso: "Tem dados mas nenhum usuario @gmail.com encontrado com nome correspondente. Use o campo overrides para mapear manualmente.",
        });
      }
    } catch (err: any) {
      resultado.push({
        email: seed.email,
        acao: "ERRO",
        erro: err.message,
      });
    }
  }

  return NextResponse.json({ ok: true, resultado });
}

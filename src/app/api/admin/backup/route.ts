import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * GET /api/admin/backup
 *
 * Exporta um snapshot completo do banco em JSON.
 * Requer role DIRETOR ou header Authorization com BACKUP_SECRET.
 *
 * Usado para:
 *  - Download manual pelo painel do diretor
 *  - Chamada automática por cron externo (cron-job.org, etc.)
 */
export async function GET(request: NextRequest) {
  // Autenticação por sessão (painel) OU por secret (cron)
  const authHeader = request.headers.get("authorization");
  const backupSecret = process.env.BACKUP_SECRET;
  const isCron = backupSecret && authHeader === `Bearer ${backupSecret}`;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session || !isDiretor(session.user.role)) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
  }

  const [
    users,
    vendas,
    registrosSDR,
    posVenda,
    configuracao,
    faixasComissao,
    solicitacoesMargem,
    campanhas,
    pendencias,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, nome: true, email: true, role: true,
        ativo: true, createdAt: true,
        // nunca exportar senha hash
      },
    }),
    prisma.venda.findMany({ orderBy: { dataConversao: "asc" } }),
    prisma.registroSDR.findMany({ orderBy: { dataRegistro: "asc" } }),
    prisma.posVenda.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.configuracao.findFirst(),
    prisma.faixaComissao.findMany({ orderBy: { ordem: "asc" } }),
    prisma.solicitacaoMargem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.campanha.findMany({ orderBy: { createdAt: "asc" } }).catch(() => []),
    prisma.pendenciaVinculo.findMany({ orderBy: { createdAt: "asc" } }).catch(() => []),
  ]);

  const backup = {
    exportadoEm: new Date().toISOString(),
    versao: "1.0",
    totais: {
      users: users.length,
      vendas: vendas.length,
      registrosSDR: registrosSDR.length,
      posVenda: posVenda.length,
      solicitacoesMargem: solicitacoesMargem.length,
      campanhas: campanhas.length,
      pendencias: pendencias.length,
    },
    dados: {
      users,
      vendas,
      registrosSDR,
      posVenda,
      configuracao,
      faixasComissao,
      solicitacoesMargem,
      campanhas,
      pendencias,
    },
  };

  const json = JSON.stringify(backup, null, 2);
  const dataStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `backup-livenergia-${dataStr}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

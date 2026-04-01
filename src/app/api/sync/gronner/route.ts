import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { criarGronnerClient } from "@/lib/gronner-client";
import { extrairDadosRegex, calcularScore } from "@/lib/lead-scoring";

// POST /api/sync/gronner — Sincronizar leads e projetos do Gronner CRM
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const client = criarGronnerClient();

    // Buscar todos os projetos (deals)
    const projetos = await client.buscarTodosProjetos();

    let synced = 0;
    let scored = 0;

    for (const projeto of projetos) {
      const gronnerId = String(projeto.id);
      const nome = projeto.nome || projeto.cliente || "Sem nome";

      // Tentar extrair score se houver conversa/observacao
      let icpScore = 0;
      let icpClasse = "frio";
      const conversa = projeto.observacao || projeto.descricao || null;
      if (conversa) {
        const dados = extrairDadosRegex(conversa);
        if (dados) {
          const resultado = calcularScore(dados);
          icpScore = resultado.score;
          icpClasse = resultado.classe;
          scored++;
        }
      }

      await prisma.gronnerLead.upsert({
        where: { gronnerId },
        update: {
          nome,
          telefone: projeto.telefone || null,
          origem: projeto.origem?.nome || null,
          icpScore,
          icpClasse,
          status: projeto.status?.nome || null,
          etapa: projeto.etapa || null,
          preVendedor:
            projeto.preVendedor && projeto.preVendedor !== "Sem Pré Vendedor"
              ? projeto.preVendedor
              : null,
          vendedor: projeto.vendedorResponsavel || null,
          valorProposta: projeto.valor || null,
          synced_at: new Date(),
        },
        create: {
          gronnerId,
          nome,
          telefone: projeto.telefone || null,
          origem: projeto.origem?.nome || null,
          icpScore,
          icpClasse,
          status: projeto.status?.nome || null,
          etapa: projeto.etapa || null,
          preVendedor:
            projeto.preVendedor && projeto.preVendedor !== "Sem Pré Vendedor"
              ? projeto.preVendedor
              : null,
          vendedor: projeto.vendedorResponsavel || null,
          valorProposta: projeto.valor || null,
          gronnerCreatedAt: projeto.dataCriacao || null,
        },
      });
      synced++;
    }

    return NextResponse.json({
      success: true,
      totalProjetos: projetos.length,
      synced,
      scored,
      message: `Sync concluido: ${synced} leads sincronizados, ${scored} com scoring ICP`,
    });
  } catch (error: any) {
    console.error("Erro no sync Gronner:", error);
    return NextResponse.json({ error: error.message || "Erro interno no sync" }, { status: 500 });
  }
}

// GET /api/sync/gronner — Status do ultimo sync
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const lastSync = await prisma.gronnerLead.findFirst({
    orderBy: { synced_at: "desc" },
    select: { synced_at: true },
  });

  const counts = await prisma.gronnerLead.groupBy({
    by: ["icpClasse"],
    _count: true,
  });

  const total = await prisma.gronnerLead.count();

  return NextResponse.json({
    lastSync: lastSync?.synced_at || null,
    total,
    porClasse: Object.fromEntries(counts.map((c) => [c.icpClasse || "sem_classe", c._count])),
    configured: !!(process.env.GRONNER_URL && process.env.GRONNER_EMAIL && process.env.GRONNER_PASS),
  });
}

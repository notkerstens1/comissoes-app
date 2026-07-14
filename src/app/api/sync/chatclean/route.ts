import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { criarChatCleanClient } from "@/lib/chatclean-client";
import { mapearOportunidadeParaLead } from "@/lib/chatclean-leads";

// POST /api/sync/chatclean — Sincroniza oportunidades do ChatClean CRM (funil inteiro)
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const client = criarChatCleanClient();
    const oportunidades = await client.buscarTodasOportunidades();

    let synced = 0;
    for (const op of oportunidades) {
      const lead = mapearOportunidadeParaLead(op, op.etapa);
      const { chatcleanId, chatcleanCreatedAt, ...campos } = lead;
      await prisma.chatCleanLead.upsert({
        where: { chatcleanId },
        update: { ...campos, synced_at: new Date() },
        create: { chatcleanId, chatcleanCreatedAt, ...campos },
      });
      synced++;
    }

    return NextResponse.json({
      success: true,
      totalOportunidades: oportunidades.length,
      synced,
      message: `Sync ChatClean concluido: ${synced} oportunidades sincronizadas`,
    });
  } catch (error: any) {
    console.error("Erro no sync ChatClean:", error);
    return NextResponse.json({ error: error.message || "Erro interno no sync" }, { status: 500 });
  }
}

// GET /api/sync/chatclean — Status do ultimo sync
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const lastSync = await prisma.chatCleanLead.findFirst({
    orderBy: { synced_at: "desc" },
    select: { synced_at: true },
  });

  const counts = await prisma.chatCleanLead.groupBy({
    by: ["icpClasse"],
    _count: true,
  });

  const total = await prisma.chatCleanLead.count();

  return NextResponse.json({
    lastSync: lastSync?.synced_at || null,
    total,
    porClasse: Object.fromEntries(counts.map((c) => [c.icpClasse || "sem_classe", c._count])),
    configured: !!(
      process.env.CHATCLEAN_BASE_URL &&
      process.env.CHATCLEAN_API_ID &&
      process.env.CHATCLEAN_TOKEN
    ),
  });
}

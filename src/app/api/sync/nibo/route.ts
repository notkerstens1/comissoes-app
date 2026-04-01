import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";
import { fetchReceivables, fetchPayables } from "@/lib/nibo-client";

// POST /api/sync/nibo — Sincronizar dados financeiros do Nibo
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Apenas diretor pode sincronizar dados financeiros" }, { status: 401 });
  }

  const apiKey = process.env.NIBO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NIBO_API_KEY nao configurada" }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Default: ultimos 90 dias
    const endDate = body.endDate || new Date().toISOString().split("T")[0];
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() - 90);
    const startDate = body.startDate || startDefault.toISOString().split("T")[0];

    // Buscar recebimentos e pagamentos em paralelo
    const [receivables, payables] = await Promise.all([
      fetchReceivables(apiKey, startDate, endDate),
      fetchPayables(apiKey, startDate, endDate),
    ]);

    const allRecords = [...receivables, ...payables];
    let synced = 0;

    for (const record of allRecords) {
      await prisma.niboRecord.upsert({
        where: { niboId: record.niboId },
        update: {
          descricao: record.descricao,
          categoria: record.categoria,
          valor: record.valor,
          dataVencimento: record.dataVencimento,
          dataPagamento: record.dataPagamento,
          status: record.status,
          contato: record.contato,
          synced_at: new Date(),
        },
        create: {
          niboId: record.niboId,
          tipo: record.tipo,
          descricao: record.descricao,
          categoria: record.categoria,
          valor: record.valor,
          dataVencimento: record.dataVencimento,
          dataPagamento: record.dataPagamento,
          status: record.status,
          contato: record.contato,
        },
      });
      synced++;
    }

    return NextResponse.json({
      success: true,
      periodo: { startDate, endDate },
      recebimentos: receivables.length,
      pagamentos: payables.length,
      synced,
      message: `Sync concluido: ${receivables.length} recebimentos + ${payables.length} pagamentos`,
    });
  } catch (error: any) {
    console.error("Erro no sync Nibo:", error);
    return NextResponse.json({ error: error.message || "Erro interno no sync" }, { status: 500 });
  }
}

// GET /api/sync/nibo — Status do ultimo sync
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const lastSync = await prisma.niboRecord.findFirst({
    orderBy: { synced_at: "desc" },
    select: { synced_at: true },
  });

  const [totalReceber, totalPagar] = await Promise.all([
    prisma.niboRecord.count({ where: { tipo: "receber" } }),
    prisma.niboRecord.count({ where: { tipo: "pagar" } }),
  ]);

  return NextResponse.json({
    lastSync: lastSync?.synced_at || null,
    totalReceber,
    totalPagar,
    configured: !!process.env.NIBO_API_KEY,
  });
}

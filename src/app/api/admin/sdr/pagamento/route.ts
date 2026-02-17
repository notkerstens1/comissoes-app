import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// PUT - Batch marcar registros como PAGO
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registroIds } = body; // array de IDs

    if (!registroIds || !Array.isArray(registroIds) || registroIds.length === 0) {
      return NextResponse.json({ error: "IDs obrigatorios" }, { status: 400 });
    }

    const hoje = new Date().toISOString().split("T")[0];

    await prisma.registroSDR.updateMany({
      where: {
        id: { in: registroIds },
        statusPagamento: "PENDENTE",
        comissaoTotal: { gt: 0 },
      },
      data: {
        statusPagamento: "PAGO",
        dataPagamento: hoje,
        pagoPorId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, count: registroIds.length });
  } catch (error: any) {
    console.error("Erro ao processar pagamento SDR:", error);
    return NextResponse.json({ error: "Erro: " + error.message }, { status: 500 });
  }
}

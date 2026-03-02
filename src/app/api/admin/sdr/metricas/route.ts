import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

/**
 * PUT /api/admin/sdr/metricas
 * Salva override manual de métricas SDR para um período.
 * Body: { periodo: string, campo: string, valor: number }
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { periodo, campo, valor } = body;

  if (!periodo || !campo) {
    return NextResponse.json({ error: "periodo e campo obrigatorios" }, { status: 400 });
  }

  const camposValidos = ["ligacoes", "reunioesAgendadas", "cpfNegado", "desqualificados", "noShow"];
  if (!camposValidos.includes(campo)) {
    return NextResponse.json({ error: `Campo invalido: ${campo}` }, { status: 400 });
  }

  const numericValue = valor === null || valor === "" ? null : Math.max(0, parseInt(String(valor), 10) || 0);

  const override = await prisma.metricasSDROverride.upsert({
    where: { periodo },
    update: { [campo]: numericValue },
    create: { periodo, [campo]: numericValue },
  });

  return NextResponse.json(override);
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVendedor, isAdmin } from "@/lib/roles";

// GET — oportunidades abertas do vendedor logado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isVendedor(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registros = await prisma.registroSDR.findMany({
    where: {
      vendedoraId: session.user.id,
      statusLead: { in: ["AGENDADO", "COMPARECEU"] },
    },
    include: {
      sdr: { select: { id: true, nome: true } },
    },
    orderBy: [
      { dataFechamentoEsperado: "asc" },
      { dataReuniao: "asc" },
    ],
  });

  // Calcular resumo
  const totalForecast = registros.reduce((sum, r) => sum + (r.valorForecast ?? 0), 0);
  const totalPonderado = registros.reduce(
    (sum, r) => sum + (r.valorForecast ?? 0) * (r.probabilidade / 100),
    0
  );

  return NextResponse.json({ registros, totalForecast, totalPonderado });
}

// PUT — atualizar campos de forecast de uma oportunidade
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isVendedor(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { registroId, valorForecast, estagioOportunidade, probabilidade, dataFechamentoEsperado } = body;

  if (!registroId) {
    return NextResponse.json({ error: "registroId obrigatorio" }, { status: 400 });
  }

  // Verificar que o registro pertence ao vendedor
  const registro = await prisma.registroSDR.findUnique({ where: { id: registroId } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
  if (!isAdmin(role) && registro.vendedoraId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const updated = await prisma.registroSDR.update({
    where: { id: registroId },
    data: {
      ...(valorForecast !== undefined && { valorForecast: Number(valorForecast) }),
      ...(estagioOportunidade !== undefined && { estagioOportunidade }),
      ...(probabilidade !== undefined && { probabilidade: Math.min(100, Math.max(0, Number(probabilidade))) }),
      ...(dataFechamentoEsperado !== undefined && { dataFechamentoEsperado: dataFechamentoEsperado || null }),
    },
  });

  return NextResponse.json(updated);
}

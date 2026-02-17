import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isSDR } from "@/lib/roles";
import { COMISSAO_REUNIAO } from "@/lib/sdr";

// GET - Listar registros (SDR=proprios, Admin=todos)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // "YYYY-MM"

  const where: any = {};

  // SDR ve apenas seus proprios registros
  if (isSDR(session.user.role)) {
    where.sdrId = session.user.id;
  }

  // Filtrar por mes (dataRegistro comeca com "YYYY-MM")
  if (mes) {
    where.dataRegistro = { startsWith: mes };
  }

  const registros = await prisma.registroSDR.findMany({
    where,
    include: {
      sdr: { select: { nome: true } },
      vendedora: { select: { nome: true } },
      vendaVinculada: { select: { id: true, cliente: true, valorVenda: true, dataConversao: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(registros);
}

// POST - Criar novo registro SDR
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // Apenas SDR ou Admin podem criar
  if (!isSDR(session.user.role) && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nomeCliente, vendedoraId, dataReuniao, compareceu, motivoNaoCompareceu, consideracoes } = body;

    if (!nomeCliente?.trim() || !vendedoraId || !dataReuniao) {
      return NextResponse.json({ error: "Campos obrigatorios faltando" }, { status: 400 });
    }

    // Validar vendedora existe
    const vendedora = await prisma.user.findUnique({ where: { id: vendedoraId } });
    if (!vendedora) {
      return NextResponse.json({ error: "Vendedora nao encontrada" }, { status: 400 });
    }

    const comissaoReuniao = compareceu ? COMISSAO_REUNIAO : 0;
    const hoje = new Date().toISOString().split("T")[0];

    // Status inicial: se compareceu -> COMPARECEU, senao -> AGENDADO
    const statusLead = compareceu ? "COMPARECEU" : "AGENDADO";

    const registro = await prisma.registroSDR.create({
      data: {
        sdrId: session.user.id,
        dataRegistro: hoje,
        nomeCliente: nomeCliente.trim(),
        vendedoraId,
        dataReuniao,
        compareceu: !!compareceu,
        motivoNaoCompareceu: compareceu ? null : (motivoNaoCompareceu || null),
        consideracoes: consideracoes?.trim() || null,
        comissaoReuniao,
        comissaoVenda: 0,
        comissaoTotal: comissaoReuniao,
        statusLead,
      },
      include: {
        sdr: { select: { nome: true } },
        vendedora: { select: { nome: true } },
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar registro SDR:", error);
    return NextResponse.json({ error: "Erro ao criar registro: " + error.message }, { status: 500 });
  }
}

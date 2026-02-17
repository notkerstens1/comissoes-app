import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { formatDateStr, getNow } from "@/lib/dates";

// GET - Listar campanhas
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ativas = searchParams.get("ativas");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (ativas === "true") {
    const hoje = formatDateStr(getNow());
    where.ativa = true;
    where.dataInicio = { lte: hoje };
    where.dataFim = { gte: hoje };
  }

  const campanhas = await prisma.campanha.findMany({
    where,
    include: {
      criadoPor: {
        select: { nome: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campanhas);
}

// POST - Criar campanha (ADMIN/DIRETOR only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { titulo, descricao, tipo, escopo, meta, dataInicio, dataFim } = body;

    // Validacoes
    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "Titulo e obrigatorio" }, { status: 400 });
    }
    if (!["VALOR", "QUANTIDADE"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo deve ser VALOR ou QUANTIDADE" }, { status: 400 });
    }
    if (!["TIME", "INDIVIDUAL"].includes(escopo)) {
      return NextResponse.json({ error: "Escopo deve ser TIME ou INDIVIDUAL" }, { status: 400 });
    }
    if (!meta || meta <= 0) {
      return NextResponse.json({ error: "Meta deve ser maior que zero" }, { status: 400 });
    }
    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: "Datas de inicio e fim sao obrigatorias" }, { status: 400 });
    }
    if (dataFim < dataInicio) {
      return NextResponse.json({ error: "Data fim deve ser >= data inicio" }, { status: 400 });
    }

    const campanha = await prisma.campanha.create({
      data: {
        titulo: titulo.trim(),
        descricao: descricao?.trim() || null,
        tipo,
        escopo,
        meta: Number(meta),
        dataInicio,
        dataFim,
        ativa: true,
        criadoPorId: (session.user as { id: string }).id,
      },
    });

    return NextResponse.json(campanha, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar campanha:", error);
    return NextResponse.json({ error: "Erro ao criar campanha" }, { status: 500 });
  }
}

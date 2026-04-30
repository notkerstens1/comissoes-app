import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";

// GET — listar registros do setor tecnico (payload enxuto: sem campos JSON pesados)
// Campos pesados (anexos, comentarios, historicoAcoes) sao buscados sob demanda
// via GET /api/setor-tecnico/[id] quando o card e expandido.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registros = await prisma.setorTecnico.findMany({
    where: { ativo: true },
    select: {
      id: true,
      nomeCliente: true,
      telefone: true,
      email: true,
      vendedorNome: true,
      etapa: true,
      observacoes: true,
      ultimaAcao: true,
      proximaAcao: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,
      // anexos e comentarios selecionados apenas para calcular count
      anexos: true,
      comentarios: true,
      venda: { select: { id: true, cliente: true, valorVenda: true, kwp: true, quantidadePlacas: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const slim = registros.map((r) => {
    const anexosCount = safeArrayLen(r.anexos);
    const comentariosCount = safeArrayLen(r.comentarios);
    const { anexos: _a, comentarios: _c, ...rest } = r;
    return { ...rest, anexosCount, comentariosCount };
  });

  return NextResponse.json(slim);
}

function safeArrayLen(json: string | null): number {
  if (!json) return 0;
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

// POST — criar novo registro no setor tecnico
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { nomeCliente, telefone, email, etapa, observacoes, vendaId, vendedorNome } = body;

  if (!nomeCliente) {
    return NextResponse.json({ error: "Nome do cliente obrigatorio" }, { status: 400 });
  }

  const registro = await prisma.setorTecnico.create({
    data: {
      nomeCliente: nomeCliente.trim(),
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      etapa: etapa || "NOVO_PROJETO",
      observacoes: observacoes?.trim() || null,
      vendaId: vendaId || null,
      vendedorNome: vendedorNome?.trim() || null,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}

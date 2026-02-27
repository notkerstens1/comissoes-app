import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isSDR } from "@/lib/roles";

/**
 * GET /api/sdr/ligacoes?data=YYYY-MM-DD
 * Retorna a quantidade de ligacoes da SDR logada para o dia
 * Admin pode passar ?sdrId=xxx para ver de outra SDR
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? new Date().toISOString().split("T")[0];

  let sdrId = session.user.id;
  if (isAdmin(session.user.role) && searchParams.get("sdrId")) {
    sdrId = searchParams.get("sdrId")!;
  } else if (!isSDR(session.user.role) && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const registro = await prisma.ligacoesSDR.findUnique({
    where: { sdrId_data: { sdrId, data } },
  });

  return NextResponse.json({ data, quantidade: registro?.quantidade ?? 0 });
}

/**
 * PUT /api/sdr/ligacoes
 * Body: { data: "YYYY-MM-DD", quantidade: number }
 * Cria ou atualiza o registro de ligacoes do dia
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!isSDR(session.user.role) && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = await request.json();
  const data = body.data ?? new Date().toISOString().split("T")[0];
  const quantidade = Math.max(0, Math.round(Number(body.quantidade) || 0));

  const sdrId = session.user.id;

  const registro = await prisma.ligacoesSDR.upsert({
    where: { sdrId_data: { sdrId, data } },
    update: { quantidade },
    create: { sdrId, data, quantidade },
  });

  return NextResponse.json(registro);
}

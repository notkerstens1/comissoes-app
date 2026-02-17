import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSDR, isAdmin } from "@/lib/roles";

// GET - Extrato detalhado de comissoes SDR
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!isSDR(session.user.role) && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // "YYYY-MM"

  const where: any = {};

  // SDR ve apenas seus proprios
  if (isSDR(session.user.role)) {
    where.sdrId = session.user.id;
  }

  if (mes) {
    where.dataRegistro = { startsWith: mes };
  }

  const registros = await prisma.registroSDR.findMany({
    where,
    include: {
      vendedora: { select: { nome: true } },
      vendaVinculada: { select: { id: true, cliente: true, valorVenda: true } },
      pagoPor: { select: { nome: true } },
    },
    orderBy: { dataReuniao: "desc" },
  });

  // Resumo
  const reunioesComissao = registros.filter((r) => r.comissaoReuniao > 0).length;
  const vendasComissao = registros.filter((r) => r.comissaoVenda > 0).length;
  const totalReuniao = registros.reduce((s, r) => s + r.comissaoReuniao, 0);
  const totalVenda = registros.reduce((s, r) => s + r.comissaoVenda, 0);
  const totalGeral = registros.reduce((s, r) => s + r.comissaoTotal, 0);

  return NextResponse.json({
    registros,
    resumo: {
      reunioesComissao,
      vendasComissao,
      totalReuniao,
      totalVenda,
      totalGeral,
    },
  });
}

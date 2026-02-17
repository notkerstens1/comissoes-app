import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSDR } from "@/lib/roles";

// GET - Dashboard stats do SDR
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!isSDR(session.user.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // "YYYY-MM"

  const where: any = { sdrId: session.user.id };
  if (mes) {
    where.dataRegistro = { startsWith: mes };
  }

  const registros = await prisma.registroSDR.findMany({ where });

  const totalRegistros = registros.length;
  const reunioesComparecidas = registros.filter((r) => r.compareceu).length;
  const vendasVinculadas = registros.filter((r) => r.vendaVinculadaId).length;

  const comissaoReuniao = registros.reduce((sum, r) => sum + r.comissaoReuniao, 0);
  const comissaoVenda = registros.reduce((sum, r) => sum + r.comissaoVenda, 0);
  const comissaoTotal = registros.reduce((sum, r) => sum + r.comissaoTotal, 0);

  const comissaoPendente = registros
    .filter((r) => r.statusPagamento === "PENDENTE")
    .reduce((sum, r) => sum + r.comissaoTotal, 0);
  const comissaoPaga = registros
    .filter((r) => r.statusPagamento === "PAGO")
    .reduce((sum, r) => sum + r.comissaoTotal, 0);

  return NextResponse.json({
    totalRegistros,
    reunioesComparecidas,
    vendasVinculadas,
    comissaoReuniao,
    comissaoVenda,
    comissaoTotal,
    comissaoPendente,
    comissaoPaga,
  });
}

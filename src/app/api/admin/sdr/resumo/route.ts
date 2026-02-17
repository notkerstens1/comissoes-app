import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET - Ranking de SDRs com metricas
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // "YYYY-MM"

  const where: any = {};
  if (mes) {
    where.dataRegistro = { startsWith: mes };
  }

  // Buscar todos os SDRs ativos
  const sdrs = await prisma.user.findMany({
    where: { role: "SDR", ativo: true },
    select: { id: true, nome: true },
  });

  // Buscar todos os registros do periodo
  const registros = await prisma.registroSDR.findMany({ where });

  // Montar ranking
  const ranking = sdrs.map((sdr) => {
    const regs = registros.filter((r) => r.sdrId === sdr.id);
    const totalRegistros = regs.length;
    const reunioes = regs.filter((r) => r.compareceu).length;
    const vendas = regs.filter((r) => r.vendaVinculadaId).length;
    const taxaConversao = reunioes > 0 ? (vendas / reunioes) * 100 : 0;
    const comissaoTotal = regs.reduce((s, r) => s + r.comissaoTotal, 0);
    const comissaoPendente = regs
      .filter((r) => r.statusPagamento === "PENDENTE")
      .reduce((s, r) => s + r.comissaoTotal, 0);
    const comissaoPaga = regs
      .filter((r) => r.statusPagamento === "PAGO")
      .reduce((s, r) => s + r.comissaoTotal, 0);

    return {
      id: sdr.id,
      nome: sdr.nome,
      totalRegistros,
      reunioes,
      vendas,
      taxaConversao: Math.round(taxaConversao),
      comissaoTotal,
      comissaoPendente,
      comissaoPaga,
    };
  });

  // Ordenar por comissao total (desc)
  ranking.sort((a, b) => b.comissaoTotal - a.comissaoTotal);

  // Totais gerais
  const totais = {
    registros: registros.length,
    reunioes: registros.filter((r) => r.compareceu).length,
    vendas: registros.filter((r) => r.vendaVinculadaId).length,
    comissaoTotal: registros.reduce((s, r) => s + r.comissaoTotal, 0),
  };

  return NextResponse.json({ ranking, totais });
}

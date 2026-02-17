import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNow, formatDateStr } from "@/lib/dates";
import { differenceInDays, parseISO } from "date-fns";

// GET - Calcular progresso da campanha
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const campanha = await prisma.campanha.findUnique({
    where: { id: params.id },
  });

  if (!campanha) {
    return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });
  }

  // Buscar vendas no periodo da campanha
  const vendas = await prisma.venda.findMany({
    where: {
      dataConversao: {
        gte: new Date(campanha.dataInicio + "T00:00:00"),
        lte: new Date(campanha.dataFim + "T23:59:59"),
      },
    },
    select: {
      vendedorId: true,
      valorVenda: true,
      vendedor: { select: { nome: true } },
    },
  });

  // Dias restantes
  const hoje = getNow();
  const fimDate = parseISO(campanha.dataFim);
  const diasRestantes = Math.max(0, differenceInDays(fimDate, hoje) + 1);

  // Data formatada do hoje para checar se campanha ja passou
  const hojeStr = formatDateStr(hoje);
  const encerrada = hojeStr > campanha.dataFim;

  if (campanha.escopo === "TIME") {
    // Meta coletiva — soma de todas as vendas
    let atual: number;
    if (campanha.tipo === "VALOR") {
      atual = vendas.reduce((s, v) => s + v.valorVenda, 0);
    } else {
      atual = vendas.length;
    }
    const percentual = campanha.meta > 0 ? (atual / campanha.meta) * 100 : 0;

    return NextResponse.json({
      campanhaId: campanha.id,
      titulo: campanha.titulo,
      tipo: campanha.tipo,
      escopo: campanha.escopo,
      meta: campanha.meta,
      dataInicio: campanha.dataInicio,
      dataFim: campanha.dataFim,
      diasRestantes,
      encerrada,
      progressoTime: {
        atual,
        meta: campanha.meta,
        percentual: Math.round(percentual * 10) / 10,
      },
    });
  } else {
    // INDIVIDUAL — progresso por vendedor
    const vendedores = await prisma.user.findMany({
      where: { role: "VENDEDOR", ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });

    const progressoIndividual = vendedores.map((v) => {
      const vendasDoVendedor = vendas.filter((vd) => vd.vendedorId === v.id);
      let atual: number;
      if (campanha.tipo === "VALOR") {
        atual = vendasDoVendedor.reduce((s, vd) => s + vd.valorVenda, 0);
      } else {
        atual = vendasDoVendedor.length;
      }
      const percentual = campanha.meta > 0 ? (atual / campanha.meta) * 100 : 0;

      return {
        vendedorId: v.id,
        vendedorNome: v.nome,
        atual,
        meta: campanha.meta,
        percentual: Math.round(percentual * 10) / 10,
      };
    });

    // Ordenar por percentual (maior primeiro)
    progressoIndividual.sort((a, b) => b.percentual - a.percentual);

    return NextResponse.json({
      campanhaId: campanha.id,
      titulo: campanha.titulo,
      tipo: campanha.tipo,
      escopo: campanha.escopo,
      meta: campanha.meta,
      dataInicio: campanha.dataInicio,
      dataFim: campanha.dataFim,
      diasRestantes,
      encerrada,
      progressoIndividual,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiasDecorridosNoMes, getTotalDiasNoMes, getMesAtual, getCurrentWeekRange } from "@/lib/dates";

// GET - Resumo do vendedor com forecast
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") || "mes"; // "semana" | "mes"

  const vendedorId = session.user.id;
  const mesAtual = getMesAtual();

  // Buscar vendas do mes
  const vendasMes = await prisma.venda.findMany({
    where: { vendedorId, mesReferencia: mesAtual },
    orderBy: { dataConversao: "desc" },
  });

  // Filtrar por periodo se necessario
  let vendasPeriodo = vendasMes;
  if (periodo === "semana") {
    const weekRange = getCurrentWeekRange();
    vendasPeriodo = vendasMes.filter((v) => {
      const dataStr = v.dataConversao.toISOString().split("T")[0];
      return dataStr >= weekRange.start && dataStr <= weekRange.end;
    });
  }

  // Calculos basicos
  const totalVendido = vendasPeriodo.reduce((s, v) => s + v.valorVenda, 0);
  const numVendas = vendasPeriodo.length;
  const ticketMedio = numVendas > 0 ? totalVendido / numVendas : 0;

  // Comissao do mes inteiro (para faixa e over)
  const totalVendidoMes = vendasMes.reduce((s, v) => s + v.valorVenda, 0);
  const comissaoBase = vendasPeriodo.reduce((s, v) => s + v.comissaoVenda, 0);
  const comissaoOver = vendasPeriodo.reduce((s, v) => s + v.comissaoOver, 0);
  const comissaoEstimada = {
    base: comissaoBase,
    over: comissaoOver,
    total: comissaoBase + comissaoOver,
  };

  // Faixas
  const faixas = await prisma.faixaComissao.findMany({
    where: { ativa: true },
    orderBy: { ordem: "asc" },
  });

  // Faixa atual
  let faixaAtual = { label: "Faixa 1", percentualOver: 0.35 };
  let proximaFaixa: { label: string; faltaValor: number } | null = null;

  for (let i = 0; i < faixas.length; i++) {
    const f = faixas[i];
    if (totalVendidoMes >= f.volumeMinimo && (f.volumeMaximo === null || totalVendidoMes < f.volumeMaximo)) {
      faixaAtual = { label: `Faixa ${f.ordem}`, percentualOver: f.percentualOver };

      // Proxima faixa
      if (i + 1 < faixas.length) {
        const proxima = faixas[i + 1];
        proximaFaixa = {
          label: `Faixa ${proxima.ordem}`,
          faltaValor: proxima.volumeMinimo - totalVendidoMes,
        };
      }
      break;
    }
  }

  // Progresso na faixa
  const faixaAtualObj = faixas.find(
    (f) => totalVendidoMes >= f.volumeMinimo && (f.volumeMaximo === null || totalVendidoMes < f.volumeMaximo)
  );
  const progressoFaixa = faixaAtualObj
    ? {
        volumeAtual: totalVendidoMes,
        volumeMinFaixa: faixaAtualObj.volumeMinimo,
        volumeMaxFaixa: faixaAtualObj.volumeMaximo || faixaAtualObj.volumeMinimo * 2,
        percentual: faixaAtualObj.volumeMaximo
          ? Math.min(
              ((totalVendidoMes - faixaAtualObj.volumeMinimo) /
                (faixaAtualObj.volumeMaximo - faixaAtualObj.volumeMinimo)) *
                100,
              100
            )
          : 100,
      }
    : null;

  // Ultimas 10 vendas (do periodo)
  const vendas = vendasPeriodo.slice(0, 10).map((v) => ({
    id: v.id,
    data: v.dataConversao,
    cliente: v.cliente,
    valor: v.valorVenda,
    status: v.status,
    comissao: v.comissaoTotal,
    margem: v.margem,
    over: v.over,
  }));

  // Alertas
  const alertas: string[] = [];
  const vendasSemOver = vendasMes.filter((v) => v.margem < 1.8);
  if (vendasSemOver.length > 0) {
    alertas.push(
      `${vendasSemOver.length} venda(s) sem over (margem < 1.8x): ${vendasSemOver.map((v) => v.cliente).join(", ")}`
    );
  }

  // Forecast: projecao para fim do mes
  const diasDecorridos = getDiasDecorridosNoMes();
  const totalDiasMes = getTotalDiasNoMes();
  const diasRestantes = totalDiasMes - diasDecorridos;

  let forecast = null;
  if (diasDecorridos > 0 && numVendas > 0) {
    const mediaDiaria = totalVendidoMes / diasDecorridos;
    const projecaoVendas = mediaDiaria * totalDiasMes;

    // Estimar comissao projetada (simplificado: usar percentual atual)
    const percentualComissao = totalVendidoMes > 0 ? (comissaoBase + comissaoOver) / totalVendidoMes : 0.025;
    const comissaoProjetada = projecaoVendas * percentualComissao;

    forecast = {
      projecaoVendas,
      comissaoProjetada,
      diasRestantes,
      mediaDiaria,
    };
  }

  return NextResponse.json({
    periodo,
    totalVendido,
    numVendas,
    ticketMedio,
    comissaoEstimada,
    faixaAtual,
    proximaFaixa,
    progressoFaixa,
    vendas,
    alertas,
    forecast,
    totalVendidoMes,
  });
}

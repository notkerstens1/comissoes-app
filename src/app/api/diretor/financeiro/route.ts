import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

// GET - Resumo financeiro mensal (diretor)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") || getCurrentMonth();

  // Buscar todas as vendas do mes com dados do vendedor
  const vendas = await prisma.venda.findMany({
    where: { mesReferencia: mes },
    include: { vendedor: { select: { nome: true, email: true } } },
    orderBy: { dataConversao: "desc" },
  });

  // Calcular resumo agregado
  const faturamentoTotal = vendas.reduce((s, v) => s + v.valorVenda, 0);
  const custoEquipamentosTotal = vendas.reduce((s, v) => s + v.custoEquipamentos, 0);
  const custoInstalacaoTotal = vendas.reduce((s, v) => s + (v.custoInstalacao ?? 0), 0);
  const custoVisitaTecnicaTotal = vendas.reduce((s, v) => s + (v.custoVisitaTecnica ?? 0), 0);
  const custoCosernTotal = vendas.reduce((s, v) => s + (v.custoCosern ?? 0), 0);
  const custoTrtCreaTotal = vendas.reduce((s, v) => s + (v.custoTrtCrea ?? 0), 0);
  const custoEngenheiroTotal = vendas.reduce((s, v) => s + (v.custoEngenheiro ?? 0), 0);
  const custoImpostoTotal = vendas.reduce((s, v) => s + (v.custoImposto ?? 0), 0);
  const comissaoVendedorTotal = vendas.reduce((s, v) => s + (v.comissaoVendedorCusto ?? v.comissaoTotal), 0);

  const custoTotalOperacional =
    custoEquipamentosTotal + custoInstalacaoTotal + custoVisitaTecnicaTotal +
    custoCosernTotal + custoTrtCreaTotal + custoEngenheiroTotal + custoImpostoTotal + comissaoVendedorTotal;

  const lucroLiquidoTotal = faturamentoTotal - custoTotalOperacional;
  const margemLucroMedia = faturamentoTotal > 0 ? lucroLiquidoTotal / faturamentoTotal : 0;
  const ticketMedio = vendas.length > 0 ? faturamentoTotal / vendas.length : 0;

  // Alertas
  let alertaMargemLucro = false;
  let mensagemAlertaLucro: string | null = null;
  if (vendas.length > 0) {
    if (margemLucroMedia < 0.20) {
      alertaMargemLucro = true;
      mensagemAlertaLucro = `Margem media de ${(margemLucroMedia * 100).toFixed(1)}% esta abaixo da meta de 20%.`;
    } else if (margemLucroMedia > 0.25) {
      alertaMargemLucro = true;
      mensagemAlertaLucro = `Margem media de ${(margemLucroMedia * 100).toFixed(1)}% esta acima de 25%.`;
    }
  }

  // Mes anterior para comparacao
  const [ano, mesNum] = mes.split("-").map(Number);
  const mesAnteriorDate = new Date(ano, mesNum - 2, 1);
  const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}`;

  const vendasMesAnterior = await prisma.venda.findMany({
    where: { mesReferencia: mesAnterior },
  });

  const faturamentoAnterior = vendasMesAnterior.reduce((s, v) => s + v.valorVenda, 0);
  const lucroAnterior = vendasMesAnterior.reduce((s, v) => s + (v.lucroLiquido ?? 0), 0);

  return NextResponse.json({
    mes,
    resumo: {
      faturamentoTotal,
      custoEquipamentosTotal,
      custoInstalacaoTotal,
      custoVisitaTecnicaTotal,
      custoCosernTotal,
      custoTrtCreaTotal,
      custoEngenheiroTotal,
      custoImpostoTotal,
      comissaoVendedorTotal,
      custoTotalOperacional,
      lucroLiquidoTotal,
      margemLucroMedia,
      quantidadeVendas: vendas.length,
      ticketMedio,
      alertaMargemLucro,
      mensagemAlertaLucro,
    },
    comparacao: {
      mesAnterior,
      faturamentoAnterior,
      lucroAnterior,
      variacaoFaturamento: faturamentoAnterior > 0
        ? ((faturamentoTotal - faturamentoAnterior) / faturamentoAnterior) * 100
        : 0,
      variacaoLucro: lucroAnterior > 0
        ? ((lucroLiquidoTotal - lucroAnterior) / lucroAnterior) * 100
        : 0,
    },
    vendas: vendas.map((v) => ({
      id: v.id,
      cliente: v.cliente,
      vendedorId: v.vendedorId,
      vendedor: v.vendedor.nome,
      valorVenda: v.valorVenda,
      custoEquipamentos: v.custoEquipamentos,
      quantidadePlacas: v.quantidadePlacas,
      quantidadeInversores: v.quantidadeInversores,
      custoInstalacao: v.custoInstalacao ?? 0,
      custoVisitaTecnica: v.custoVisitaTecnica ?? 0,
      custoCosern: v.custoCosern ?? 0,
      custoTrtCrea: v.custoTrtCrea ?? 0,
      custoEngenheiro: v.custoEngenheiro ?? 0,
      custoImposto: v.custoImposto ?? 0,
      comissaoVendedor: v.comissaoVendedorCusto ?? v.comissaoTotal,
      lucroLiquido: v.lucroLiquido ?? 0,
      margemLucroLiquido: v.margemLucroLiquido ?? 0,
      aliquotaImposto: v.aliquotaImposto,
      percentualComissaoOverride: v.percentualComissaoOverride,
      margem: v.margem,
      over: v.over,
      status: v.status,
      dataConversao: v.dataConversao,
    })),
  });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

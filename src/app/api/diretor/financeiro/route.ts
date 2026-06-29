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
    include: {
      vendedor: { select: { nome: true, email: true } },
      registrosSDR: {
        select: {
          id: true,
          nomeCliente: true,
          sdr: { select: { nome: true } },
          dataReuniao: true,
          compareceu: true,
          motivoNaoCompareceu: true,
          consideracoes: true,
          imagemUrl: true,
          statusLead: true,
        },
      },
    },
    orderBy: { dataConversao: "desc" },
  });

  // Vendas atipicas (excecao operacional: pagamento a vista declarado, usina demo)
  // ficam FORA dos indicadores de performance/margem — distorcem a media. Aparecem
  // num bloco separado pra transparencia, nunca somem.
  const vendasNormais = vendas.filter((v) => !v.atipica);
  const vendasAtipicas = vendas.filter((v) => v.atipica);

  // Calcular resumo agregado (apenas operacao recorrente — sem atipicas)
  const faturamentoTotal = vendasNormais.reduce((s, v) => s + v.valorVenda, 0);
  const custoEquipamentosTotal = vendasNormais.reduce((s, v) => s + v.custoEquipamentos, 0);
  const custoInstalacaoTotal = vendasNormais.reduce((s, v) => s + (v.custoInstalacao ?? 0), 0);
  const custoVisitaTecnicaTotal = vendasNormais.reduce((s, v) => s + (v.custoVisitaTecnica ?? 0), 0);
  const custoCosernTotal = vendasNormais.reduce((s, v) => s + (v.custoCosern ?? 0), 0);
  const custoTrtCreaTotal = vendasNormais.reduce((s, v) => s + (v.custoTrtCrea ?? 0), 0);
  const custoEngenheiroTotal = vendasNormais.reduce((s, v) => s + (v.custoEngenheiro ?? 0), 0);
  const custoMaterialCATotal = vendasNormais.reduce((s, v) => s + (v.custoMaterialCA ?? 0), 0);
  const custoImpostoTotal = vendasNormais.reduce((s, v) => s + (v.custoImposto ?? 0), 0);
  const comissaoVendedorTotal = vendasNormais.reduce((s, v) => s + (v.comissaoVendedorCusto ?? v.comissaoTotal), 0);

  const custoTotalOperacional =
    custoEquipamentosTotal + custoInstalacaoTotal + custoVisitaTecnicaTotal +
    custoCosernTotal + custoTrtCreaTotal + custoEngenheiroTotal + custoMaterialCATotal + custoImpostoTotal + comissaoVendedorTotal;

  const lucroLiquidoTotal = faturamentoTotal - custoTotalOperacional;
  const margemLucroMedia = faturamentoTotal > 0 ? lucroLiquidoTotal / faturamentoTotal : 0;
  const ticketMedio = vendasNormais.length > 0 ? faturamentoTotal / vendasNormais.length : 0;

  // Bloco separado das atipicas (transparencia, fora dos indicadores)
  const atipicas = {
    quantidade: vendasAtipicas.length,
    faturamento: vendasAtipicas.reduce((s, v) => s + v.valorVenda, 0),
    lucroLiquido: vendasAtipicas.reduce((s, v) => s + (v.lucroLiquido ?? 0), 0),
  };

  // Camada de custo fixo (resultado REAL da empresa, nivel mes — nao por venda).
  // lucroLiquidoTotal aqui = margem de contribuicao (faturamento - custos variaveis).
  // Subtraindo o custo fixo mensal chegamos no resultado operacional real.
  const config = await prisma.configuracao.findFirst();
  const custoFixoMensal = config?.custoFixoMensal ?? 40000;
  const margemContribuicao = lucroLiquidoTotal; // antes do custo fixo
  const resultadoOperacional = margemContribuicao - custoFixoMensal;
  const margemReal = faturamentoTotal > 0 ? resultadoOperacional / faturamentoTotal : 0;
  // Ponto de equilibrio (em faturamento): quanto vender pra zerar o custo fixo,
  // dada a margem de contribuicao percentual atual.
  const pontoEquilibrio = margemLucroMedia > 0 ? custoFixoMensal / margemLucroMedia : 0;

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

  const vendasAnteriorNormais = vendasMesAnterior.filter((v) => !v.atipica);
  const faturamentoAnterior = vendasAnteriorNormais.reduce((s, v) => s + v.valorVenda, 0);
  const lucroAnterior = vendasAnteriorNormais.reduce((s, v) => s + (v.lucroLiquido ?? 0), 0);

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
      custoMaterialCATotal,
      custoImpostoTotal,
      comissaoVendedorTotal,
      custoTotalOperacional,
      lucroLiquidoTotal,
      margemLucroMedia,
      quantidadeVendas: vendasNormais.length,
      ticketMedio,
      alertaMargemLucro,
      mensagemAlertaLucro,
      // Camada de custo fixo / resultado real
      custoFixoMensal,
      margemContribuicao,
      resultadoOperacional,
      margemReal,
      pontoEquilibrio,
      // Vendas atipicas (fora dos indicadores acima)
      atipicas,
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
      custoMaterialCA: v.custoMaterialCA ?? 0,
      custoImposto: v.custoImposto ?? 0,
      comissaoVendedor: v.comissaoVendedorCusto ?? v.comissaoTotal,
      lucroLiquido: v.lucroLiquido ?? 0,
      margemLucroLiquido: v.margemLucroLiquido ?? 0,
      aliquotaImposto: v.aliquotaImposto,
      percentualComissaoOverride: v.percentualComissaoOverride,
      margem: v.margem,
      over: v.over,
      atipica: v.atipica,
      status: v.status,
      dataConversao: v.dataConversao,
      orcamentoUrl: v.orcamentoUrl,
      registrosSDR: v.registrosSDR.map((sdr) => ({
        id: sdr.id,
        nomeCliente: sdr.nomeCliente,
        sdrNome: sdr.sdr.nome,
        dataReuniao: sdr.dataReuniao,
        compareceu: sdr.compareceu,
        motivoNaoCompareceu: sdr.motivoNaoCompareceu,
        consideracoes: sdr.consideracoes,
        imagemUrl: sdr.imagemUrl,
        statusLead: sdr.statusLead,
      })),
    })),
  });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

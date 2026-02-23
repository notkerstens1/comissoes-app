// ============================================================
// LOGICA DE CALCULO DE CUSTOS - VISAO DO DIRETOR
// ============================================================

export interface ConfiguracaoCustos {
  custoPlacaInstalacao: number;     // padrao R$70
  custoInversorInstalacao: number;  // padrao R$250
  custoVisitaTecnicaPadrao: number; // padrao R$120
  custoCosernPadrao: number;        // padrao R$70
  custoTrtCreaPadrao: number;       // padrao R$65
  custoEngenheiroPadrao: number;    // padrao R$400 por instalacao
  custoMaterialCAPadrao: number;    // padrao R$500
  aliquotaImpostoPadrao: number;    // padrao 0.06 (6%)
}

export interface DadosCustoVenda {
  valorVenda: number;
  custoEquipamentos: number;
  quantidadePlacas: number;
  quantidadeInversores: number;
  comissaoTotal: number;
  // Overrides do diretor (null = usar padrao da config)
  custoInstalacaoOverride?: number | null;
  custoVisitaTecnicaOverride?: number | null;
  custoCosernOverride?: number | null;
  custoTrtCreaOverride?: number | null;
  custoEngenheiroOverride?: number | null;
  custoMaterialCAOverride?: number | null;
  aliquotaImpostoOverride?: number | null;
}

export interface ResultadoCustos {
  custoInstalacao: number;
  custoVisitaTecnica: number;
  custoCosern: number;
  custoTrtCrea: number;
  custoEngenheiro: number;
  custoMaterialCA: number;
  custoImposto: number;
  comissaoVendedor: number;
  custoTotalOperacional: number;
  lucroLiquido: number;
  margemLucroLiquido: number;
  alertaMargemLucro: boolean;
  mensagemAlertaLucro: string | null;
}

export interface ResumoFinanceiroMensal {
  faturamentoTotal: number;
  custoEquipamentosTotal: number;
  custoInstalacaoTotal: number;
  custoVisitaTecnicaTotal: number;
  custoCosernTotal: number;
  custoTrtCreaTotal: number;
  custoEngenheiroTotal: number;
  custoMaterialCATotal: number;
  custoImpostoTotal: number;
  comissaoVendedorTotal: number;
  custoTotalOperacional: number;
  lucroLiquidoTotal: number;
  margemLucroMedia: number;
  quantidadeVendas: number;
  ticketMedio: number;
  alertaMargemLucro: boolean;
  mensagemAlertaLucro: string | null;
}

// ============================================================
// CALCULOS INDIVIDUAIS
// ============================================================

/**
 * Calcula o custo de instalacao
 * = (placas x custoPlaca) + (inversores x custoInversor)
 */
export function calcularCustoInstalacao(
  placas: number,
  inversores: number,
  config: ConfiguracaoCustos
): number {
  return (placas * config.custoPlacaInstalacao) + (inversores * config.custoInversorInstalacao);
}

/**
 * Calcula o imposto sobre o servico
 * Servico = Valor Venda - Custo Equipamentos
 * Imposto = Servico x aliquota (6%)
 */
export function calcularImposto(
  valorVenda: number,
  custoEquipamentos: number,
  aliquota: number
): number {
  const valorServico = Math.max(valorVenda - custoEquipamentos, 0);
  return valorServico * aliquota;
}

/**
 * Calcula todos os custos de uma venda individual
 *
 * Lucro Liquido = Valor Venda - Equipamentos - Instalacao - Visita - COSERN - TRT - Imposto - Comissao
 * Margem = Lucro Liquido / Valor Venda (meta: 20-25%)
 */
export function calcularCustosVenda(
  dados: DadosCustoVenda,
  config: ConfiguracaoCustos
): ResultadoCustos {
  // Instalacao: usa override do diretor OU calcula automaticamente
  const custoInstalacao = dados.custoInstalacaoOverride ??
    calcularCustoInstalacao(dados.quantidadePlacas, dados.quantidadeInversores, config);

  // Custos fixos: usa override do diretor OU padrao da config
  const custoVisitaTecnica = dados.custoVisitaTecnicaOverride ?? config.custoVisitaTecnicaPadrao;
  const custoCosern = dados.custoCosernOverride ?? config.custoCosernPadrao;
  const custoTrtCrea = dados.custoTrtCreaOverride ?? config.custoTrtCreaPadrao;
  const custoEngenheiro = dados.custoEngenheiroOverride ?? config.custoEngenheiroPadrao;
  const custoMaterialCA = dados.custoMaterialCAOverride ?? config.custoMaterialCAPadrao;

  // Imposto: usa aliquota override do diretor OU padrao
  const aliquota = dados.aliquotaImpostoOverride ?? config.aliquotaImpostoPadrao;
  const custoImposto = calcularImposto(dados.valorVenda, dados.custoEquipamentos, aliquota);

  // Comissao do vendedor (ja calculada pelo sistema de comissoes)
  const comissaoVendedor = dados.comissaoTotal;

  // Custo total = tudo menos o valor de venda e equipamentos
  const custoTotalOperacional =
    dados.custoEquipamentos +
    custoInstalacao +
    custoVisitaTecnica +
    custoCosern +
    custoTrtCrea +
    custoEngenheiro +
    custoMaterialCA +
    custoImposto +
    comissaoVendedor;

  // Lucro liquido
  const lucroLiquido = dados.valorVenda - custoTotalOperacional;

  // Margem de lucro liquido
  const margemLucroLiquido = dados.valorVenda > 0
    ? lucroLiquido / dados.valorVenda
    : 0;

  // Alerta de margem (meta: 20-25%)
  let alertaMargemLucro = false;
  let mensagemAlertaLucro: string | null = null;

  if (margemLucroLiquido < 0.20) {
    alertaMargemLucro = true;
    mensagemAlertaLucro = `Margem de ${(margemLucroLiquido * 100).toFixed(1)}% esta abaixo da meta de 20%. Revise os custos desta venda.`;
  } else if (margemLucroLiquido > 0.25) {
    alertaMargemLucro = true;
    mensagemAlertaLucro = `Margem de ${(margemLucroLiquido * 100).toFixed(1)}% esta acima de 25%.`;
  }

  return {
    custoInstalacao,
    custoVisitaTecnica,
    custoCosern,
    custoTrtCrea,
    custoEngenheiro,
    custoMaterialCA,
    custoImposto,
    comissaoVendedor,
    custoTotalOperacional,
    lucroLiquido,
    margemLucroLiquido,
    alertaMargemLucro,
    mensagemAlertaLucro,
  };
}

// ============================================================
// RESUMO FINANCEIRO MENSAL (AGREGADO)
// ============================================================

/**
 * Calcula o resumo financeiro mensal agregando todas as vendas
 */
export function calcularResumoFinanceiroMensal(
  vendas: {
    valorVenda: number;
    custoEquipamentos: number;
    custoInstalacao: number;
    custoVisitaTecnica: number;
    custoCosern: number;
    custoTrtCrea: number;
    custoEngenheiro: number;
    custoMaterialCA: number;
    custoImposto: number;
    comissaoVendedorCusto: number;
    lucroLiquido: number;
  }[]
): ResumoFinanceiroMensal {
  const quantidadeVendas = vendas.length;

  if (quantidadeVendas === 0) {
    return {
      faturamentoTotal: 0,
      custoEquipamentosTotal: 0,
      custoInstalacaoTotal: 0,
      custoVisitaTecnicaTotal: 0,
      custoCosernTotal: 0,
      custoTrtCreaTotal: 0,
      custoEngenheiroTotal: 0,
      custoMaterialCATotal: 0,
      custoImpostoTotal: 0,
      comissaoVendedorTotal: 0,
      custoTotalOperacional: 0,
      lucroLiquidoTotal: 0,
      margemLucroMedia: 0,
      quantidadeVendas: 0,
      ticketMedio: 0,
      alertaMargemLucro: false,
      mensagemAlertaLucro: null,
    };
  }

  const faturamentoTotal = vendas.reduce((s, v) => s + v.valorVenda, 0);
  const custoEquipamentosTotal = vendas.reduce((s, v) => s + v.custoEquipamentos, 0);
  const custoInstalacaoTotal = vendas.reduce((s, v) => s + v.custoInstalacao, 0);
  const custoVisitaTecnicaTotal = vendas.reduce((s, v) => s + v.custoVisitaTecnica, 0);
  const custoCosernTotal = vendas.reduce((s, v) => s + v.custoCosern, 0);
  const custoTrtCreaTotal = vendas.reduce((s, v) => s + v.custoTrtCrea, 0);
  const custoEngenheiroTotal = vendas.reduce((s, v) => s + v.custoEngenheiro, 0);
  const custoMaterialCATotal = vendas.reduce((s, v) => s + v.custoMaterialCA, 0);
  const custoImpostoTotal = vendas.reduce((s, v) => s + v.custoImposto, 0);
  const comissaoVendedorTotal = vendas.reduce((s, v) => s + v.comissaoVendedorCusto, 0);

  const custoTotalOperacional =
    custoEquipamentosTotal +
    custoInstalacaoTotal +
    custoVisitaTecnicaTotal +
    custoCosernTotal +
    custoTrtCreaTotal +
    custoEngenheiroTotal +
    custoMaterialCATotal +
    custoImpostoTotal +
    comissaoVendedorTotal;

  const lucroLiquidoTotal = vendas.reduce((s, v) => s + v.lucroLiquido, 0);
  const margemLucroMedia = faturamentoTotal > 0 ? lucroLiquidoTotal / faturamentoTotal : 0;
  const ticketMedio = faturamentoTotal / quantidadeVendas;

  let alertaMargemLucro = false;
  let mensagemAlertaLucro: string | null = null;

  if (margemLucroMedia < 0.20) {
    alertaMargemLucro = true;
    mensagemAlertaLucro = `Margem media de ${(margemLucroMedia * 100).toFixed(1)}% esta abaixo da meta de 20%.`;
  } else if (margemLucroMedia > 0.25) {
    alertaMargemLucro = true;
    mensagemAlertaLucro = `Margem media de ${(margemLucroMedia * 100).toFixed(1)}% esta acima de 25%.`;
  }

  return {
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
    quantidadeVendas,
    ticketMedio,
    alertaMargemLucro,
    mensagemAlertaLucro,
  };
}

// ============================================================
// LÓGICA DE CÁLCULO DE COMISSÃO - ENERGIA SOLAR
// ============================================================

export interface FaixaComissao {
  ordem: number;
  volumeMinimo: number;
  volumeMaximo: number | null;
  percentualOver: number;
  ativa?: boolean;
}

export interface ConfiguracaoComissao {
  fatorMultiplicador: number; // padrão 1.8
  fatorGeracao: number; // padrão 136
  percentualComissaoVenda: number; // padrão 0.025 (2.5%)
  volumeMinimoComissao: number; // padrão 60000
}

export interface DadosVenda {
  valorVenda: number;
  custoEquipamentos: number;
  kwp: number;
}

export interface ResultadoCalculo {
  over: number;
  margem: number;
  geracaoKwh: number;
  comissaoVenda: number;
  comissaoOver: number;
  comissaoTotal: number;
  alertaMargem: boolean;
  mensagemAlerta: string | null;
}

export interface ResultadoComissaoMensal {
  totalVendido: number;
  quantidadeVendas: number;
  comissaoVendaTotal: number;
  comissaoOverTotal: number;
  comissaoTotal: number;
  faixaAtual: string;
  detalhamentoFaixas: {
    faixa: string;
    volumeNaFaixa: number;
    percentualOver: number;
    comissaoOverFaixa: number;
  }[];
  alertas: string[];
}

// ============================================================
// CÁLCULOS INDIVIDUAIS POR VENDA
// ============================================================

/**
 * Calcula o OVER de uma venda individual
 * OVER = MAX(Valor Venda - Equipamentos × fator, 0)
 */
export function calcularOver(
  valorVenda: number,
  custoEquipamentos: number,
  fatorMultiplicador: number
): number {
  const over = valorVenda - custoEquipamentos * fatorMultiplicador;
  return Math.max(over, 0);
}

/**
 * Calcula a MARGEM de uma venda
 * MARGEM = Valor Venda / Custo Equipamentos
 */
export function calcularMargem(
  valorVenda: number,
  custoEquipamentos: number
): number {
  if (custoEquipamentos === 0) return 0;
  return valorVenda / custoEquipamentos;
}

/**
 * Calcula a geração estimada em kWh
 * GERAÇÃO = kWp × fator de geração (padrão 136)
 */
export function calcularGeracaoKwh(kwp: number, fatorGeracao: number): number {
  return kwp * fatorGeracao;
}

/**
 * Verifica se a margem está abaixo do mínimo (1.8x)
 * Se estiver abaixo, vendedor NÃO comissiona sobre over
 */
export function verificarMargemMinima(margem: number): {
  abaixo: boolean;
  mensagem: string | null;
} {
  if (margem < 1.8) {
    return {
      abaixo: true,
      mensagem: `Atenção: esta venda está com margem de ${margem.toFixed(2)}x (abaixo de 1.8x). Você não receberá comissão sobre o over desta venda.`,
    };
  }
  return { abaixo: false, mensagem: null };
}

/**
 * Calcula todos os campos de uma venda individual
 */
export function calcularVenda(
  dados: DadosVenda,
  config: ConfiguracaoComissao
): ResultadoCalculo {
  const margem = calcularMargem(dados.valorVenda, dados.custoEquipamentos);
  const geracaoKwh = calcularGeracaoKwh(dados.kwp, config.fatorGeracao);
  const over = calcularOver(
    dados.valorVenda,
    dados.custoEquipamentos,
    config.fatorMultiplicador
  );

  const { abaixo: alertaMargem, mensagem: mensagemAlerta } =
    verificarMargemMinima(margem);

  // Comissão sobre venda = Valor × percentual (2.5%)
  const comissaoVenda = dados.valorVenda * config.percentualComissaoVenda;

  // Se margem < 1.8x, NÃO comissiona sobre over
  // O cálculo do over por faixa é feito na comissão mensal
  // Aqui guardamos o over bruto para usar depois
  const comissaoOver = 0; // será calculado no contexto mensal

  return {
    over: alertaMargem ? 0 : over, // se margem < 1.8, over = 0
    margem,
    geracaoKwh,
    comissaoVenda,
    comissaoOver,
    comissaoTotal: comissaoVenda + comissaoOver,
    alertaMargem,
    mensagemAlerta,
  };
}

// ============================================================
// CÁLCULO PROGRESSIVO POR FAIXAS (MENSAL)
// ============================================================

/**
 * Faixas padrão de comissão:
 * - Abaixo de R$60k: SEM COMISSÃO
 * - R$60k - R$120k: 2.5% + 35% over
 * - R$121k - R$170k: 2.5% + 45% over (só diferença)
 * - Acima R$171k: 2.5% + 50% over (só diferença)
 *
 * A lógica é PROGRESSIVA (tipo IR):
 * As faixas superiores só se aplicam ao valor que excede o limite anterior.
 */
export function calcularComissaoOverProgressiva(
  vendasDoMes: { valorVenda: number; over: number; margem: number }[],
  faixas: FaixaComissao[]
): {
  comissaoOverTotal: number;
  detalhamentoFaixas: {
    faixa: string;
    volumeNaFaixa: number;
    percentualOver: number;
    comissaoOverFaixa: number;
  }[];
} {
  const totalVendido = vendasDoMes.reduce((sum, v) => sum + v.valorVenda, 0);

  // Soma total de over apenas das vendas com margem >= 1.8
  const totalOver = vendasDoMes.reduce((sum, v) => sum + v.over, 0);

  if (totalOver <= 0) {
    return { comissaoOverTotal: 0, detalhamentoFaixas: [] };
  }

  // Ordenar faixas por ordem
  const faixasOrdenadas = [...faixas].filter((f) => f.ativa).sort((a, b) => a.ordem - b.ordem);

  let comissaoOverTotal = 0;
  const detalhamentoFaixas: {
    faixa: string;
    volumeNaFaixa: number;
    percentualOver: number;
    comissaoOverFaixa: number;
  }[] = [];

  // Calcular proporção do over para cada faixa baseado no volume vendido

  for (const faixa of faixasOrdenadas) {
    if (totalVendido <= faixa.volumeMinimo) break;

    const limiteInferior = faixa.volumeMinimo;
    const limiteSuperior = faixa.volumeMaximo ?? Infinity;

    const volumeNaFaixa = Math.min(totalVendido, limiteSuperior) - limiteInferior;

    if (volumeNaFaixa <= 0) continue;

    // Proporção do volume total que cai nesta faixa
    const proporcao = volumeNaFaixa / totalVendido;

    // Over proporcional a esta faixa
    const overNaFaixa = totalOver * proporcao;

    // Comissão over desta faixa
    const comissaoOverFaixa = overNaFaixa * faixa.percentualOver;

    comissaoOverTotal += comissaoOverFaixa;

    const faixaLabel =
      faixa.volumeMaximo
        ? `R$${(faixa.volumeMinimo / 1000).toFixed(0)}k - R$${(faixa.volumeMaximo / 1000).toFixed(0)}k`
        : `Acima de R$${(faixa.volumeMinimo / 1000).toFixed(0)}k`;

    detalhamentoFaixas.push({
      faixa: faixaLabel,
      volumeNaFaixa,
      percentualOver: faixa.percentualOver,
      comissaoOverFaixa,
    });

  }

  return { comissaoOverTotal, detalhamentoFaixas };
}

/**
 * Calcula a comissão mensal completa de um vendedor
 */
export function calcularComissaoMensal(
  vendas: { valorVenda: number; over: number; margem: number; custoEquipamentos: number }[],
  faixas: FaixaComissao[],
  config: ConfiguracaoComissao
): ResultadoComissaoMensal {
  const totalVendido = vendas.reduce((sum, v) => sum + v.valorVenda, 0);
  const quantidadeVendas = vendas.length;

  // Comissão sobre venda (2.5%) SEMPRE é calculada
  const comissaoVendaTotal = totalVendido * config.percentualComissaoVenda;

  // Comissão over progressiva (sempre calculada, sem regra de volume minimo)
  const { comissaoOverTotal, detalhamentoFaixas } =
    calcularComissaoOverProgressiva(vendas, faixas);

  // Alertas de margem
  const alertas: string[] = [];
  vendas.forEach((v, i) => {
    if (v.margem < 1.8 && v.margem > 0) {
      alertas.push(
        `Venda ${i + 1} com margem de ${v.margem.toFixed(2)}x (abaixo de 1.8x) - sem comissão de over nesta venda.`
      );
    }
  });

  // Determinar faixa atual
  const faixasOrdenadas = [...faixas].filter((f) => f.ativa).sort((a, b) => a.ordem - b.ordem);
  let faixaAtual = "Faixa 1";
  for (const f of faixasOrdenadas) {
    if (totalVendido >= f.volumeMinimo) {
      const label = f.volumeMaximo
        ? `R$${(f.volumeMinimo / 1000).toFixed(0)}k - R$${(f.volumeMaximo / 1000).toFixed(0)}k (${(f.percentualOver * 100).toFixed(0)}% over)`
        : `Acima de R$${(f.volumeMinimo / 1000).toFixed(0)}k (${(f.percentualOver * 100).toFixed(0)}% over)`;
      faixaAtual = label;
    }
  }

  return {
    totalVendido,
    quantidadeVendas,
    comissaoVendaTotal,
    comissaoOverTotal,
    comissaoTotal: comissaoVendaTotal + comissaoOverTotal,
    faixaAtual,
    detalhamentoFaixas,
    alertas,
  };
}

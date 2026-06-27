// ============================================================
// COMISSAO DO SUPERVISOR
// ============================================================
// A FAIXA do supervisor é definida pela QUANTIDADE de vendas do time no mês
// (meta = metaVendasQtdMes por vendedor x nº de vendedores ativos), conforme
// % da meta de vendas atingida:
//   <  80% da meta  -> percentualSupervisorAte80      (default 0%)
//   80% a 99% meta  -> percentualSupervisor80a100     (default 0,8%)
//  >= 100% da meta  -> percentualSupervisorAcima100   (default 1,0%)
// A COMISSÃO em si é calculada sobre o VALOR (receita total): receita x percentual.
// ============================================================

export interface ConfiguracaoSupervisor {
  metaReceitaMensal: number;       // R$ — só exibição (receita realizada / referência)
  metaVendasQtdTime: number;       // QUANTIDADE de vendas do time = meta/vendedor x nº vendedores
  percentualSupervisorAte80: number;
  percentualSupervisor80a100: number;
  percentualSupervisorAcima100: number;
}

export interface ComissaoSupervisorResultado {
  mesReferencia: string;          // "YYYY-MM"
  metaReceita: number;            // R$ (referência de receita)
  metaVendasQtdTime: number;      // meta de QUANTIDADE de vendas do time
  totalVendido: number;           // R$
  quantidadeVendas: number;       // nº de vendas do time no mês
  percentualAtingido: number;     // 0..N (1 = 100%) — sobre a QUANTIDADE de vendas
  faixa: "ate_80" | "80_a_100" | "acima_100";
  percentualAplicavel: number;    // 0..1
  comissaoCalculada: number;      // R$ (totalVendido * percentualAplicavel — sobre o VALOR)
  // Projecao linear ate o fim do mes
  projecao?: {
    diasDecorridos: number;
    diasTotal: number;
    receitaProjetada: number;     // R$
    vendasProjetadas: number;     // qtd projetada
    percentualProjetado: number;  // sobre a quantidade projetada
    faixaProjetada: "ate_80" | "80_a_100" | "acima_100";
    comissaoProjetada: number;    // R$ (receita projetada * percentual da faixa projetada)
  };
}

export function calcularComissaoSupervisor(
  totalVendido: number,
  quantidadeVendas: number,
  config: ConfiguracaoSupervisor,
  mesReferencia: string,
  diasDecorridos?: number,
  diasTotal?: number
): ComissaoSupervisorResultado {
  // % atingido é sobre a QUANTIDADE de vendas do time (não a receita)
  const percentualAtingido = config.metaVendasQtdTime > 0
    ? quantidadeVendas / config.metaVendasQtdTime
    : 0;

  const { faixa, percentual } = aplicarFaixa(percentualAtingido, config);
  // Comissão segue sobre o VALOR (receita total)
  const comissaoCalculada = totalVendido * percentual;

  let projecao: ComissaoSupervisorResultado["projecao"];
  if (diasDecorridos && diasTotal && diasDecorridos > 0 && diasDecorridos < diasTotal) {
    const fator = diasTotal / diasDecorridos;
    const receitaProjetada = totalVendido * fator;
    const vendasProjetadas = quantidadeVendas * fator;
    const percentualProjetado = config.metaVendasQtdTime > 0
      ? vendasProjetadas / config.metaVendasQtdTime
      : 0;
    const { faixa: faixaProj, percentual: percentualProj } = aplicarFaixa(percentualProjetado, config);
    projecao = {
      diasDecorridos,
      diasTotal,
      receitaProjetada,
      vendasProjetadas,
      percentualProjetado,
      faixaProjetada: faixaProj,
      comissaoProjetada: receitaProjetada * percentualProj,
    };
  }

  return {
    mesReferencia,
    metaReceita: config.metaReceitaMensal,
    metaVendasQtdTime: config.metaVendasQtdTime,
    totalVendido,
    quantidadeVendas,
    percentualAtingido,
    faixa,
    percentualAplicavel: percentual,
    comissaoCalculada,
    projecao,
  };
}

function aplicarFaixa(
  percentualAtingido: number,
  config: ConfiguracaoSupervisor
): { faixa: "ate_80" | "80_a_100" | "acima_100"; percentual: number } {
  if (percentualAtingido >= 1.0) {
    return { faixa: "acima_100", percentual: config.percentualSupervisorAcima100 };
  }
  if (percentualAtingido >= 0.8) {
    return { faixa: "80_a_100", percentual: config.percentualSupervisor80a100 };
  }
  return { faixa: "ate_80", percentual: config.percentualSupervisorAte80 };
}

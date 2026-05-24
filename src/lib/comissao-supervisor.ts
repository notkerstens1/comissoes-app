// ============================================================
// COMISSAO DO SUPERVISOR
// ============================================================
// Supervisor recebe percentual sobre receita mensal total da empresa,
// aplicado em faixas conforme % da meta atingida:
//   <  80% da meta  -> percentualSupervisorAte80      (default 0%)
//   80% a 99% meta  -> percentualSupervisor80a100     (default 0,8%)
//  >= 100% da meta  -> percentualSupervisorAcima100   (default 1,0%)
// ============================================================

export interface ConfiguracaoSupervisor {
  metaReceitaMensal: number;
  percentualSupervisorAte80: number;
  percentualSupervisor80a100: number;
  percentualSupervisorAcima100: number;
}

export interface ComissaoSupervisorResultado {
  mesReferencia: string;          // "YYYY-MM"
  metaReceita: number;            // R$
  totalVendido: number;           // R$
  percentualAtingido: number;     // 0..N (1 = 100%)
  faixa: "ate_80" | "80_a_100" | "acima_100";
  percentualAplicavel: number;    // 0..1
  comissaoCalculada: number;      // R$ (totalVendido * percentualAplicavel)
  // Projecao linear ate o fim do mes (totalVendido / diasDecorridos * diasTotal)
  projecao?: {
    diasDecorridos: number;
    diasTotal: number;
    receitaProjetada: number;
    percentualProjetado: number;
    faixaProjetada: "ate_80" | "80_a_100" | "acima_100";
    comissaoProjetada: number;
  };
}

export function calcularComissaoSupervisor(
  totalVendido: number,
  config: ConfiguracaoSupervisor,
  mesReferencia: string,
  diasDecorridos?: number,
  diasTotal?: number
): ComissaoSupervisorResultado {
  const percentualAtingido = config.metaReceitaMensal > 0
    ? totalVendido / config.metaReceitaMensal
    : 0;

  const { faixa, percentual } = aplicarFaixa(percentualAtingido, config);
  const comissaoCalculada = totalVendido * percentual;

  let projecao: ComissaoSupervisorResultado["projecao"];
  if (diasDecorridos && diasTotal && diasDecorridos > 0 && diasDecorridos < diasTotal) {
    const receitaProjetada = (totalVendido / diasDecorridos) * diasTotal;
    const percentualProjetado = config.metaReceitaMensal > 0
      ? receitaProjetada / config.metaReceitaMensal
      : 0;
    const { faixa: faixaProj, percentual: percentualProj } = aplicarFaixa(percentualProjetado, config);
    projecao = {
      diasDecorridos,
      diasTotal,
      receitaProjetada,
      percentualProjetado,
      faixaProjetada: faixaProj,
      comissaoProjetada: receitaProjetada * percentualProj,
    };
  }

  return {
    mesReferencia,
    metaReceita: config.metaReceitaMensal,
    totalVendido,
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

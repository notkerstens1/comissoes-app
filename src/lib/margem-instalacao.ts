// ============================================================
// MARGEM DE INSTALACAO
// ============================================================
// Calcula custo estimado de uma instalacao com base em metragem, bitola, tipo
// do inversor (mono/trifasico) e cidade. Compara com o custo real lancado pelo
// engenheiro e classifica como VERDE / AMARELO / VERMELHO.
//
// Regras (apuradas pelo Pedro em 34 instalacoes):
//   - Padrao operacional: ate 15m de cabo por perna, custo medio R$998
//   - Tolerado: 15-20m por perna, ainda dentro do precificado
//   - Acima de 20m: precisa renegociar com cliente OU absorver perda consciente
// ============================================================

export type BitolaCabo = "6mm" | "10mm";

export interface PrecoMaterialEntry {
  chave: string;
  precoUnit: number;
  unidade: string;
}

export interface CustoDeslocamentoEntry {
  cidade: string;
  valor: number;
}

export interface ConfigMargemInstalacao {
  limiteCustoInstalacao: number;
  metragemCaboPadrao: number;
  metragemCaboTolerada: number;
}

export interface InputsCalculoInstalacao {
  metragemCaboPrevista: number;
  bitolaCabo: BitolaCabo;
  inversorTrifasico: boolean;
  cidadeInstalacao?: string;
}

const TERRA_METROS = 15; // Pedro: terra fica em ~15m fixos por instalacao

function findPreco(precos: PrecoMaterialEntry[], chave: string, fallback = 0): number {
  return precos.find((p) => p.chave === chave)?.precoUnit ?? fallback;
}

function findDeslocamento(deslocs: CustoDeslocamentoEntry[], cidade?: string): number {
  if (!cidade) return 0;
  const c = cidade.trim().toLowerCase();
  return deslocs.find((d) => d.cidade.toLowerCase() === c)?.valor ?? 0;
}

/**
 * Calcula custo estimado de instalacao no fechamento da venda.
 * Pernas = 2 (mono) ou 4 (trifasico). Terra adiciona 15m fixos.
 * Eletroduto e proporcional a metragem; DPS/disjuntor/quadro sao fixos.
 */
export function calcularCustoInstalacaoEstimado(
  inputs: InputsCalculoInstalacao,
  precos: PrecoMaterialEntry[],
  deslocamentos: CustoDeslocamentoEntry[]
): number {
  const pernas = inputs.inversorTrifasico ? 4 : 2;
  const metrosCabo = inputs.metragemCaboPrevista * pernas + TERRA_METROS;

  const precoMetro = inputs.bitolaCabo === "10mm"
    ? findPreco(precos, "CABO_10MM", 9.9)
    : findPreco(precos, "CABO_6MM", 5);
  const custoCabo = metrosCabo * precoMetro;

  // Eletroduto: ~1 secao por 3m de cabo. Bitola 10mm pede eletroduto maior.
  const secoesEletroduto = Math.max(1, Math.ceil(inputs.metragemCaboPrevista / 3));
  const precoEletroduto = inputs.bitolaCabo === "10mm"
    ? findPreco(precos, "ELETRODUTO_UMA", 12)
    : findPreco(precos, "ELETRODUTO_MEIA", 8);
  const custoEletroduto = secoesEletroduto * precoEletroduto;

  // Fixos
  const custoFixos = findPreco(precos, "DPS", 80)
    + findPreco(precos, "DISJUNTOR", 35)
    + findPreco(precos, "QUADRO", 90);

  const custoDeslocamento = findDeslocamento(deslocamentos, inputs.cidadeInstalacao);

  return Math.round((custoCabo + custoEletroduto + custoFixos + custoDeslocamento) * 100) / 100;
}

/**
 * Sugere a bitola do cabo com base na potencia do inversor e metragem.
 * <=5kW + ate 25m -> 6mm. Acima disso -> 10mm.
 */
export function sugerirBitolaCabo(
  potenciaInversorKw: number,
  metragemCabo: number
): BitolaCabo {
  if (potenciaInversorKw > 5) return "10mm";
  if (metragemCabo > 25) return "10mm";
  return "6mm";
}

export type StatusMargem = "VERDE" | "AMARELO" | "VERMELHO";

/**
 * Classifica o status da margem da instalacao apos a execucao (custo real).
 * Permite override por observacao (ex: estourou mas foi negociado com cliente
 * -> diretor marca como AMARELO mesmo acima do limite).
 */
export function classificarMargemInstalacao(
  custoReal: number,
  config: ConfigMargemInstalacao
): StatusMargem {
  const limite = config.limiteCustoInstalacao;
  if (custoReal <= limite) return "VERDE";
  if (custoReal <= limite * 1.5) return "AMARELO";
  return "VERMELHO";
}

/**
 * Pre-classifica baseado em metragem prevista (antes da instalacao acontecer).
 * Usado pra avisar o vendedor durante o fechamento.
 */
export function preClassificarPorMetragem(
  metragemPorPerna: number,
  config: ConfigMargemInstalacao
): { status: StatusMargem; mensagem: string } {
  if (metragemPorPerna <= config.metragemCaboPadrao) {
    return {
      status: "VERDE",
      mensagem: `Dentro do padrao (ate ${config.metragemCaboPadrao}m por perna).`,
    };
  }
  if (metragemPorPerna <= config.metragemCaboTolerada) {
    return {
      status: "AMARELO",
      mensagem: `Tolerado (ate ${config.metragemCaboTolerada}m). Ainda dentro da precificacao.`,
    };
  }
  return {
    status: "VERMELHO",
    mensagem: `Acima de ${config.metragemCaboTolerada}m por perna. Negocie material extra com o cliente OU peca aprovacao do diretor pra absorver.`,
  };
}

// Precos padrao (sementes — Pedro e diretor afinam via admin)
export const PRECOS_MATERIAL_DEFAULT: Omit<PrecoMaterialEntry, "ativo">[] = [
  { chave: "CABO_6MM",         precoUnit: 5.00,  unidade: "m"  },
  { chave: "CABO_10MM",        precoUnit: 9.90,  unidade: "m"  },
  { chave: "ELETRODUTO_MEIA",  precoUnit: 8.00,  unidade: "un" },
  { chave: "ELETRODUTO_UMA",   precoUnit: 12.00, unidade: "un" },
  { chave: "DPS",              precoUnit: 80.00, unidade: "un" },
  { chave: "DISJUNTOR",        precoUnit: 35.00, unidade: "un" },
  { chave: "QUADRO",           precoUnit: 90.00, unidade: "un" },
];

export const PRECO_MATERIAL_LABELS: Record<string, string> = {
  CABO_6MM:        "Cabo 6mm",
  CABO_10MM:       "Cabo 10mm",
  ELETRODUTO_MEIA: "Eletroduto 1/2 pol",
  ELETRODUTO_UMA:  "Eletroduto 1 pol",
  DPS:             "DPS",
  DISJUNTOR:       "Disjuntor",
  QUADRO:          "Quadro",
};

export const DESLOCAMENTOS_DEFAULT: Omit<CustoDeslocamentoEntry, "id">[] = [
  { cidade: "Natal",    valor: 0   },
  { cidade: "Parnamirim", valor: 30  },
  { cidade: "Macaiba",  valor: 50  },
  { cidade: "Mossoro",  valor: 300 },
];

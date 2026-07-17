// Placar de meta do mes para o dashboard principal.
//
// A meta da empresa e a QUANTIDADE de contratos, nao a receita — o ticket medio
// nao e controlavel. A meta de contratos = soma das metas individuais dos
// vendedores ativos (consolidado 8, novato 6, editavel por vendedor).
//
// A receita aparece como projecao de referencia (valor fixo em config), sem
// cobranca/barra: so mostra o realizado x a projecao.
//
// O realizado se divide por statusContrato:
//   COMPLETO    = venda 100% finalizada (dinheiro no caixa)  -> "efetivo"
//   A_FINALIZAR = so assinou contrato, falta burocracia      -> "a finalizar"
// A separacao importa: contrato assinado com pendencia ainda nao e caixa.

export interface VendaMeta {
  valorVenda: number;
  statusContrato: string; // "COMPLETO" | "A_FINALIZAR"
}

export interface MetaMesDimensao {
  vendas: number;
  faturamento: number;
}

export interface MetaMesResult {
  vendedoresAtivos: number;
  meta: MetaMesDimensao; // vendas = soma das metas individuais; faturamento = projecao
  efetivo: MetaMesDimensao; // statusContrato COMPLETO
  aFinalizar: MetaMesDimensao; // statusContrato A_FINALIZAR
  total: MetaMesDimensao; // efetivo + aFinalizar
}

const zero = (): MetaMesDimensao => ({ vendas: 0, faturamento: 0 });

export function buildMetaMes(
  metaContratos: number, // soma das metas de contratos dos vendedores ativos
  receitaProjetada: number, // projecao de receita (referencia, valor fixo)
  vendedoresAtivos: number,
  vendas: VendaMeta[]
): MetaMesResult {
  const efetivo = zero();
  const aFinalizar = zero();

  for (const v of vendas) {
    const valor = Number.isFinite(v.valorVenda) ? v.valorVenda : 0;
    const bucket = v.statusContrato === "A_FINALIZAR" ? aFinalizar : efetivo;
    bucket.vendas += 1;
    bucket.faturamento += valor;
  }

  return {
    vendedoresAtivos,
    meta: {
      vendas: metaContratos,
      faturamento: receitaProjetada,
    },
    efetivo,
    aFinalizar,
    total: {
      vendas: efetivo.vendas + aFinalizar.vendas,
      faturamento: efetivo.faturamento + aFinalizar.faturamento,
    },
  };
}

// Soma as metas individuais de contratos dos vendedores ativos.
// Cada vendedor usa a sua meta; se nao tiver (null), cai no default global.
export function somarMetasContratos(
  metasIndividuais: (number | null | undefined)[],
  defaultGlobal: number
): number {
  return metasIndividuais.reduce<number>(
    (soma, m) => soma + (m != null && m > 0 ? m : defaultGlobal),
    0
  );
}

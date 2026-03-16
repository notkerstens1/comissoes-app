// ============================================================
// CONSTANTES DO MODULO POS VENDA
// ============================================================

export const ETAPAS_POS_VENDA = [
  { key: "DESQUALIFICADO",     label: "Desqualificado",        cor: "red",     ordem: 1  },
  { key: "TRAMITES",           label: "Trâmites Finais",       cor: "amber",   ordem: 2  },
  { key: "VENDA_CONCLUIDA",    label: "Venda Concluída",       cor: "lime",    ordem: 3  },
  { key: "ASSINATURA",         label: "Assinatura do Contrato",cor: "cyan",    ordem: 4  },
  { key: "VISITA_TECNICA",     label: "Visita Técnica",        cor: "orange",  ordem: 5  },
  { key: "AGUARDANDO_MATERIAL",label: "Aguardando Material",   cor: "yellow",  ordem: 6  },
  { key: "INSTALACAO",         label: "Instalação",            cor: "violet",  ordem: 7  },
  { key: "AGUARDANDO_VISTORIA",label: "Aguardando Vistoria",   cor: "rose",    ordem: 8  },
  { key: "SISTEMA_OPERACAO",   label: "Sistema em Operação",   cor: "blue",    ordem: 9  },
  { key: "CADASTRAR_APP",      label: "Cadastrar no App",       cor: "emerald", ordem: 10 },
  { key: "ACOMPANHAMENTO_30",  label: "Acompanhamento 30 dias", cor: "teal",   ordem: 11 },
  { key: "CLIENTE_FINALIZADO", label: "Cliente Finalizado",     cor: "gray",    ordem: 12 },
  { key: "MANUTENCOES",        label: "Manutenções",            cor: "slate",   ordem: 13 },
] as const;

export type EtapaPosVenda = (typeof ETAPAS_POS_VENDA)[number]["key"];

export function getEtapaLabel(key: string): string {
  return ETAPAS_POS_VENDA.find((e) => e.key === key)?.label ?? key;
}

export function getEtapaOrdem(key: string): number {
  return ETAPAS_POS_VENDA.find((e) => e.key === key)?.ordem ?? 0;
}

export function getProximaEtapa(key: string): EtapaPosVenda | null {
  const atual = ETAPAS_POS_VENDA.find((e) => e.key === key);
  if (!atual || atual.ordem >= 13) return null;
  return (ETAPAS_POS_VENDA.find((e) => e.ordem === atual.ordem + 1)?.key ?? null) as EtapaPosVenda | null;
}

// Cores Tailwind por etapa (bg e text)
export const ETAPA_CORES: Record<string, { bg: string; text: string; border: string }> = {
  DESQUALIFICADO:      { bg: "bg-red-400/10",     text: "text-red-400",     border: "border-red-400/30"     },
  TRAMITES:            { bg: "bg-amber-400/10",   text: "text-amber-400",   border: "border-amber-400/30"   },
  VENDA_CONCLUIDA:     { bg: "bg-lime-400/10",    text: "text-lime-400",    border: "border-lime-400/30"    },
  ASSINATURA:          { bg: "bg-cyan-400/10",    text: "text-cyan-400",    border: "border-cyan-400/30"    },
  VISITA_TECNICA:      { bg: "bg-orange-400/10",  text: "text-orange-400",  border: "border-orange-400/30"  },
  AGUARDANDO_MATERIAL: { bg: "bg-yellow-400/10",  text: "text-yellow-400",  border: "border-yellow-400/30"  },
  INSTALACAO:          { bg: "bg-violet-400/10",  text: "text-violet-400",  border: "border-violet-400/30"  },
  AGUARDANDO_VISTORIA: { bg: "bg-rose-400/10",    text: "text-rose-400",    border: "border-rose-400/30"    },
  SISTEMA_OPERACAO:    { bg: "bg-blue-400/10",    text: "text-blue-400",    border: "border-blue-400/30"    },
  CADASTRAR_APP:       { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  ACOMPANHAMENTO_30:   { bg: "bg-teal-400/10",    text: "text-teal-400",    border: "border-teal-400/30"    },
  CLIENTE_FINALIZADO:  { bg: "bg-gray-400/10",    text: "text-gray-400",    border: "border-gray-400/30"    },
  MANUTENCOES:         { bg: "bg-slate-400/10",   text: "text-slate-400",   border: "border-slate-400/30"   },
};

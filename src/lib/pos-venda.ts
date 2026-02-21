// ============================================================
// CONSTANTES DO MODULO POS VENDA
// ============================================================

export const ETAPAS_POS_VENDA = [
  { key: "TRAMITES",            label: "Trâmites Finais",     cor: "amber",   ordem: 1 },
  { key: "AGUARDANDO_MATERIAL", label: "Aguardando Material", cor: "yellow",  ordem: 2 },
  { key: "VISITA_TECNICA",      label: "Visita Técnica",      cor: "orange",  ordem: 3 },
  { key: "AGUARDANDO_VISTORIA", label: "Aguardando Vistoria", cor: "rose",    ordem: 4 },
  { key: "POS_ATIVACAO",        label: "Pós-Ativação",        cor: "emerald", ordem: 5 },
  { key: "CONCLUIDA",           label: "Concluída",           cor: "gray",    ordem: 6 },
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
  if (!atual || atual.ordem >= 6) return null;
  return (ETAPAS_POS_VENDA.find((e) => e.ordem === atual.ordem + 1)?.key ?? null) as EtapaPosVenda | null;
}

// Cores Tailwind por etapa (bg e text)
export const ETAPA_CORES: Record<string, { bg: string; text: string; border: string }> = {
  TRAMITES:            { bg: "bg-amber-400/10",   text: "text-amber-400",   border: "border-amber-400/30" },
  AGUARDANDO_MATERIAL: { bg: "bg-yellow-400/10",  text: "text-yellow-400",  border: "border-yellow-400/30" },
  VISITA_TECNICA:      { bg: "bg-orange-400/10",  text: "text-orange-400",  border: "border-orange-400/30" },
  AGUARDANDO_VISTORIA: { bg: "bg-rose-400/10",    text: "text-rose-400",    border: "border-rose-400/30" },
  POS_ATIVACAO:        { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  CONCLUIDA:           { bg: "bg-gray-400/10",    text: "text-gray-400",    border: "border-gray-400/30" },
};

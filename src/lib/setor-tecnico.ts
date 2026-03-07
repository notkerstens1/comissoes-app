// ============================================================
// CONSTANTES DO MODULO SETOR TECNICO
// ============================================================

export const ETAPAS_SETOR_TECNICO = [
  { key: "NOVO_PROJETO",     label: "Novo Projeto",      cor: "sky",     ordem: 1 },
  { key: "CONSULTAR_CARGA",  label: "Consultar Carga",   cor: "amber",   ordem: 2 },
  { key: "AUMENTO_CARGA",    label: "Aumento de Carga",  cor: "orange",  ordem: 3 },
  { key: "EMITIR_TRT",       label: "Emitir TRT",        cor: "violet",  ordem: 4 },
  { key: "PROJETO_ENVIADO",  label: "Projeto Enviado",   cor: "cyan",    ordem: 5 },
  { key: "PROJETO_APROVADO", label: "Projeto Aprovado",  cor: "emerald", ordem: 6 },
] as const;

export type EtapaSetorTecnico = (typeof ETAPAS_SETOR_TECNICO)[number]["key"];

export function getEtapaTecnicoLabel(key: string): string {
  return ETAPAS_SETOR_TECNICO.find((e) => e.key === key)?.label ?? key;
}

export function getEtapaTecnicoOrdem(key: string): number {
  return ETAPAS_SETOR_TECNICO.find((e) => e.key === key)?.ordem ?? 0;
}

export function getProximaEtapaTecnico(key: string): EtapaSetorTecnico | null {
  const atual = ETAPAS_SETOR_TECNICO.find((e) => e.key === key);
  if (!atual || atual.ordem >= 6) return null;
  return (ETAPAS_SETOR_TECNICO.find((e) => e.ordem === atual.ordem + 1)?.key ?? null) as EtapaSetorTecnico | null;
}

// Cores Tailwind por etapa (bg e text)
export const ETAPA_TECNICO_CORES: Record<string, { bg: string; text: string; border: string }> = {
  NOVO_PROJETO:     { bg: "bg-sky-400/10",     text: "text-sky-400",     border: "border-sky-400/30"     },
  CONSULTAR_CARGA:  { bg: "bg-amber-400/10",   text: "text-amber-400",   border: "border-amber-400/30"   },
  AUMENTO_CARGA:    { bg: "bg-orange-400/10",  text: "text-orange-400",  border: "border-orange-400/30"  },
  EMITIR_TRT:       { bg: "bg-violet-400/10",  text: "text-violet-400",  border: "border-violet-400/30"  },
  PROJETO_ENVIADO:  { bg: "bg-cyan-400/10",    text: "text-cyan-400",    border: "border-cyan-400/30"    },
  PROJETO_APROVADO: { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
};

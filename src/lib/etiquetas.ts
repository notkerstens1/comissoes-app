// ============================================================
// ETIQUETAS MANUAIS DO CARD (pos-venda e setor tecnico)
// ============================================================
// Marcadores aplicados a mao pelo operador, PARALELOS a etapa do funil.
// Servem pra distinguir cards que estao na mesma etapa mas em situacoes
// diferentes (ex: "fechado" vs "ainda em tramitacao" vs "travado por debito").
// Multi-select: um card pode ter varias ao mesmo tempo (ex: fechado + debito).
//
// Persistencia: coluna `etiquetas String?` em PosVenda e SetorTecnico,
// guardando JSON.stringify de um array de keys (ex: ["FECHADO","DEBITO"]).
// Mutacao SEMPRE por endpoint dedicado (/etiquetas) com toggle server-side —
// nunca pelo PUT generico, que rejeita arrays pra evitar clobber concorrente.

export const ETIQUETAS = [
  { key: "FECHADO",    label: "Card fechado",       cor: "emerald" },
  { key: "TRAMITACAO", label: "Em tramitação",      cor: "amber"   },
  { key: "DEBITO",     label: "Cliente com débito", cor: "red"     },
] as const;

export type EtiquetaKey = (typeof ETIQUETAS)[number]["key"];

export function getEtiqueta(key: string) {
  return ETIQUETAS.find((e) => e.key === key);
}

export function isEtiquetaValida(key: string): boolean {
  return ETIQUETAS.some((e) => e.key === key);
}

// Cores Tailwind por etiqueta. DEBITO com destaque mais forte (pedido do Yuri:
// "que ele ta com debito ficar bem destacado").
export const ETIQUETA_CORES: Record<string, { bg: string; text: string; border: string }> = {
  FECHADO:    { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40" },
  TRAMITACAO: { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/40"   },
  DEBITO:     { bg: "bg-red-500/20",     text: "text-red-300",     border: "border-red-500/60"     },
};

// Parse defensivo: aceita string (JSON) ou null/undefined e devolve so keys validas.
export function parseEtiquetas(raw: string | null | undefined): EtiquetaKey[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (k): k is EtiquetaKey => typeof k === "string" && isEtiquetaValida(k),
    );
  } catch {
    return [];
  }
}

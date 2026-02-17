// ============================================================
// SDR: Utilitarios e constantes
// ============================================================

/** Valor da comissao por reuniao comparecida */
export const COMISSAO_REUNIAO = 20;

/** Valor da comissao quando lead vira venda */
export const COMISSAO_VENDA_SDR = 20;

/** Janela em dias para buscar match de venda (parametrizavel) */
export const JANELA_VINCULO_DIAS = 60;

/** Motivos padronizados para nao comparecimento */
export const MOTIVOS_NAO_COMPARECEU = [
  "No-show",
  "Remarcou",
  "Cancelou",
  "Não respondeu",
] as const;

/** Motivos padronizados para finalizacao do lead (coluna Finalizados) */
export const MOTIVOS_FINALIZACAO = [
  "CPF negada",
  "Sem capacidade financeira",
  "Sumiu / Sem retorno",
  "Só queria preço",
  "Sem interesse",
  "Fechou com concorrente",
  "Fora da região",
  "Desistiu",
  "Outro",
] as const;

/** Status do lead no funil SDR */
export type StatusLead = "AGENDADO" | "COMPARECEU" | "VENDIDO" | "FINALIZADO";

/** Colunas do Kanban SDR */
export const COLUNAS_KANBAN: { key: StatusLead; label: string; sublabel: string }[] = [
  { key: "AGENDADO", label: "Agendados", sublabel: "Reunião marcada / Remarcados" },
  { key: "COMPARECEU", label: "Compareceram", sublabel: "Aguardando venda" },
  { key: "FINALIZADO", label: "Finalizados", sublabel: "CPF negada, sumiu, etc." },
];

/**
 * Normaliza nome do cliente para matching:
 * - minusculo
 * - remove acentos
 * - trim
 * - colapsa espacos duplicados
 */
export function normalizeClientName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritical marks
    .trim()
    .replace(/\s+/g, " ");
}

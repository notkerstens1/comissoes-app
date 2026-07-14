// Mapeamento oportunidade ChatClean → ChatCleanLead + scoring ICP baseado no funil.
// O CRM já qualifica pelo estágio/valor/status — sinal melhor que o antigo regex-na-conversa.
import type { Opportunity } from "./chatclean-client";

export interface LeadScore {
  icpScore: number;
  icpClasse: string; // "quente_a" | "quente_b" | "morno" | "frio"
}

// Score derivado do próprio funil: fechou > tem proposta > só aberto > perdido.
export function scoreOportunidade(op: Pick<Opportunity, "status" | "value">): LeadScore {
  if (op.status === "lost") return { icpScore: 20, icpClasse: "frio" };
  if (op.status === "won") return { icpScore: 90, icpClasse: "quente_a" };
  // open
  const value = op.value ?? 0;
  if (value > 0) return { icpScore: 65, icpClasse: "morno" };
  return { icpScore: 20, icpClasse: "frio" };
}

export interface ChatCleanLeadInput {
  chatcleanId: string;
  nome: string;
  telefone: string | null;
  origem: string | null;
  icpScore: number;
  icpClasse: string;
  status: string | null;
  etapa: string | null;
  vendedor: string | null;
  valorProposta: number | null;
  chatcleanCreatedAt: string | null;
}

export function mapearOportunidadeParaLead(op: Opportunity, etapaNome: string): ChatCleanLeadInput {
  const { icpScore, icpClasse } = scoreOportunidade(op);
  return {
    chatcleanId: String(op.id),
    nome: op.contact?.name || "Sem nome",
    telefone: op.contact?.number || null,
    origem: (op.contact?.leadOrigin as string) || null,
    icpScore,
    icpClasse,
    status: op.status || null,
    etapa: etapaNome || null,
    vendedor: op.responsibleId || null,
    valorProposta: op.value ?? null,
    chatcleanCreatedAt: op.createdAt || null,
  };
}

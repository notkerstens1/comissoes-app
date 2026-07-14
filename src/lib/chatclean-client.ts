// ChatClean CRM API Client — integração externa multi-tenant (substitui o antigo CRM).
// Base path: /v1/api/external/{apiId}/...  ·  auth Bearer JWT.
// Respostas em envelope { success?, data[], count?, hasMore? } — sempre extrair .data.
// opportunities exige ?pipelineStepId (uma etapa por vez); iterar pipeline-steps pro funil todo.
// Ref: clientes/liv/sistema/chatclean-api.md

interface ChatCleanConfig {
  baseUrl: string;
  apiId: string;
  token: string;
}

export interface PipelineStep {
  id: number;
  name: string;
  color?: string;
  order?: number;
}

export interface Opportunity {
  id: number;
  value?: number | string; // a API devolve como string ("18000.00")
  status?: "open" | "won" | "lost";
  responsibleId?: string | number; // a API devolve como número
  userId?: string;
  pipelineStepId?: number;
  contact?: { id?: number; name?: string; number?: string; [k: string]: any };
  createdAt?: string;
  [k: string]: any;
}

// Fallback: etapas do funil da LIV capturadas em 2026-07-14 (via /pipeline-steps quando funcionava).
// Usado só quando o endpoint pipeline-steps do ChatClean está fora (bug do servidor deles).
export const FALLBACK_PIPELINE_STEPS: PipelineStep[] = [
  { id: 258, name: "Reunião (SQL)" }, { id: 264, name: "LEAD" }, { id: 246, name: "Reunião (SQL)" },
  { id: 248, name: "Reunião (SQL)" }, { id: 274, name: "follow 1" }, { id: 242, name: "LEAD" },
  { id: 250, name: "Reunião (SQL)" }, { id: 275, name: "follow 2" }, { id: 251, name: "Proposta" },
  { id: 260, name: "Proposta" }, { id: 247, name: "Proposta" }, { id: 262, name: "Reunião Externo (SQL)" },
  { id: 243, name: "QUALIFICADO (MQL)" }, { id: 265, name: "QUALIFICADO (MQL)" }, { id: 273, name: "follow" },
  { id: 276, name: "follow 3" }, { id: 272, name: "follow" }, { id: 249, name: "Proposta" },
  { id: 263, name: "Proposta Externo" }, { id: 277, name: "follow 4" }, { id: 278, name: "follow 5" },
];

export class ChatCleanClient {
  private baseUrl: string;
  private apiId: string;
  private token: string;

  constructor(config: ChatCleanConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiId = config.apiId;
    this.token = config.token;
  }

  // GET genérico: monta URL, Bearer auth, extrai .data do envelope.
  private async getData<T = any>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`ChatClean API erro: ${res.status}`);
    const json = await res.json();
    return json.data as T;
  }

  // Etapas do funil (ordenadas). Atenção: a conta traz múltiplos funis misturados.
  async listarPipelineSteps(): Promise<PipelineStep[]> {
    return this.getData<PipelineStep[]>(`/v1/api/external/${this.apiId}/pipeline-steps`);
  }

  // Oportunidades de UMA etapa (a API exige pipelineStepId — 1 etapa por vez).
  async listarOportunidadesPorEtapa(pipelineStepId: number | string): Promise<Opportunity[]> {
    return this.getData<Opportunity[]>(`/v1/api/external/${this.apiId}/opportunities`, {
      pipelineStepId,
    });
  }

  // Funil inteiro: itera todas as etapas e achata, anotando a etapa (nome + id) em cada oportunidade.
  // "Tudo num funil só" — a segmentação por funil pode ser refinada depois filtrando os step-ids.
  async buscarTodasOportunidades(): Promise<(Opportunity & { etapa: string })[]> {
    // pipeline-steps do ChatClean às vezes cai (500 no servidor deles) — cai pro fallback conhecido.
    let steps: PipelineStep[];
    try {
      steps = await this.listarPipelineSteps();
    } catch (e) {
      console.warn(
        "ChatClean pipeline-steps indisponível, usando lista de etapas fallback:",
        (e as Error).message
      );
      steps = FALLBACK_PIPELINE_STEPS;
    }
    const todas: (Opportunity & { etapa: string })[] = [];
    for (const step of steps) {
      // Resiliência: uma etapa que dá erro (500/404) não pode derrubar o sync inteiro — pula e segue.
      try {
        const ops = await this.listarOportunidadesPorEtapa(step.id);
        for (const op of ops) {
          todas.push({ ...op, etapa: step.name, pipelineStepId: step.id });
        }
      } catch (e) {
        console.warn(
          `ChatClean: etapa ${step.id} (${step.name}) falhou, pulando:`,
          (e as Error).message
        );
      }
    }
    return todas;
  }
}

// Factory: lê credenciais do env (CHATCLEAN_BASE_URL / CHATCLEAN_API_ID / CHATCLEAN_TOKEN).
export function criarChatCleanClient(): ChatCleanClient {
  const baseUrl = process.env.CHATCLEAN_BASE_URL;
  const apiId = process.env.CHATCLEAN_API_ID;
  const token = process.env.CHATCLEAN_TOKEN;

  if (!baseUrl || !apiId || !token) {
    throw new Error("CHATCLEAN_BASE_URL, CHATCLEAN_API_ID ou CHATCLEAN_TOKEN nao configurados");
  }

  return new ChatCleanClient({ baseUrl, apiId, token });
}

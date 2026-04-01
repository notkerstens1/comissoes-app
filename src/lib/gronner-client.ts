// Gronner CRM API Client — adaptado de liv-automation/src/gronner-client.js
// JWT auth + paginacao automatica

interface GronnerConfig {
  url: string;
  email: string;
  password: string;
}

interface GronnerProjeto {
  id: string;
  nome?: string;
  status?: { nome: string };
  etapa?: string;
  preVendedor?: string;
  vendedorResponsavel?: string;
  valor?: number;
  dataCriacao?: string;
  [key: string]: any;
}

interface GronnerLead {
  id: string;
  nome?: string;
  telefone?: string;
  origem?: { nome: string };
  [key: string]: any;
}

export class GronnerClient {
  private baseUrl: string;
  private email: string;
  private password: string;
  private token: string | null = null;

  constructor(config: GronnerConfig) {
    this.baseUrl = config.url;
    this.email = config.email;
    this.password = config.password;
  }

  // Autenticar e obter JWT
  async autenticar(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/Conta/GerarToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.email, senha: this.password }),
    });

    const data = await res.json();
    if (data.StatusCode !== 200) {
      throw new Error(`Erro na autenticacao Gronner: ${data.Message}`);
    }

    this.token = data.Content.accessToken;
    return this.token!;
  }

  private async garantirAuth() {
    if (!this.token) await this.autenticar();
  }

  private async get(path: string, params?: Record<string, string | number>) {
    await this.garantirAuth();
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Gronner API erro: ${res.status}`);
    const json = await res.json();
    return json.Content;
  }

  // Listar projetos com paginacao
  async listarProjetos(pagina = 1, tamanhoPagina = 50) {
    return this.get("/api/Projeto", { PageNumber: pagina, PageSize: tamanhoPagina });
  }

  // Buscar projeto por ID
  async buscarProjeto(id: string) {
    return this.get(`/api/Projeto/${id}`);
  }

  // Listar leads
  async listarLeads(pagina = 1, tamanhoPagina = 50) {
    return this.get("/api/Lead", { PageNumber: pagina, PageSize: tamanhoPagina });
  }

  // Listar atendimentos (conversas WhatsApp)
  async listarAtendimentos(pagina = 1, tamanhoPagina = 50) {
    return this.get("/api/Atendimento", { PageNumber: pagina, PageSize: tamanhoPagina });
  }

  // Buscar origens
  async buscarOrigens() {
    return this.get("/api/Origem");
  }

  // Buscar todos os projetos com paginacao automatica
  async buscarTodosProjetos(maxPaginas = 25): Promise<GronnerProjeto[]> {
    const todos: GronnerProjeto[] = [];
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const resultado = await this.listarProjetos(pagina, 100);
      todos.push(...resultado.list);
      if (!resultado.hasNextPage) break;
    }
    return todos;
  }

  // Buscar todos os leads com paginacao automatica
  async buscarTodosLeads(maxPaginas = 10): Promise<GronnerLead[]> {
    const todos: GronnerLead[] = [];
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const resultado = await this.listarLeads(pagina, 100);
      todos.push(...resultado.list);
      if (!resultado.hasNextPage) break;
    }
    return todos;
  }
}

// Factory
export function criarGronnerClient(): GronnerClient {
  const url = process.env.GRONNER_URL;
  const email = process.env.GRONNER_EMAIL;
  const password = process.env.GRONNER_PASS;

  if (!url || !email || !password) {
    throw new Error("GRONNER_URL, GRONNER_EMAIL ou GRONNER_PASS nao configurados");
  }

  return new GronnerClient({ url, email, password });
}

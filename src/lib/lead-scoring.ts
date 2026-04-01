// Lead Scoring ICP — LIV Energia Solar
// Adaptado de liv-automation/src/scoring.js (versao regex, sem Ollama)

// Criterios ICP inline (evita leitura de arquivo em runtime)
const CRITERIOS = {
  dimensoes: {
    conta_energia: {
      faixas: [
        { min: 800, max: null, pontos: 40, label: "Acima de R$ 800/mes" },
        { min: 500, max: 800, pontos: 30, label: "R$ 500 a R$ 800/mes" },
        { min: 350, max: 500, pontos: 20, label: "R$ 350 a R$ 500/mes" },
        { min: 250, max: 350, pontos: 10, label: "R$ 250 a R$ 350/mes" },
        { min: 0, max: 250, pontos: 0, label: "Abaixo de R$ 250/mes" },
      ],
    },
    perfil_imovel: {
      opcoes: [
        { chave: "casa_propria_telhado_convencional", pontos: 25 },
        { chave: "imovel_comercial_proprio", pontos: 25 },
        { chave: "casa_propria_laje", pontos: 20 },
        { chave: "combo_familia", pontos: 20 },
        { chave: "apto_cobertura", pontos: 10 },
        { chave: "apto_sem_cobertura", pontos: 0 },
        { chave: "alugado", pontos: 0 },
      ],
    },
    autoridade_decisao: {
      opcoes: [
        { chave: "decide_sozinho", pontos: 20 },
        { chave: "casal_engajado", pontos: 20 },
        { chave: "conjuge_disponivel", pontos: 15 },
        { chave: "consultar_conjuge", pontos: 8 },
        { chave: "socio_familiar", pontos: 5 },
        { chave: "nao_decisor", pontos: 0 },
      ],
    },
    urgencia: {
      opcoes: [
        { chave: "comparando_orcamentos", pontos: 15 },
        { chave: "pesquisando_momento", pontos: 10 },
        { chave: "comecando_pesquisar", pontos: 5 },
        { chave: "curiosidade", pontos: 0 },
      ],
    },
  },
  classificacao: [
    { min: 80, max: 100, classe: "quente_a", label: "Quente A" },
    { min: 60, max: 79, classe: "quente_b", label: "Quente B" },
    { min: 40, max: 59, classe: "morno", label: "Morno" },
    { min: 0, max: 39, classe: "frio", label: "Frio" },
  ],
};

interface DadosLead {
  valor_conta_energia: number | null;
  tipo_imovel: string | null;
  autoridade_decisao: string | null;
  urgencia: string | null;
  eh_indicacao: boolean;
  nome_lead: string | null;
}

interface ScoreResult {
  score: number;
  classe: string;
  label: string;
}

function scoreConta(valor: number | null): number {
  if (valor == null) return 0;
  const faixa = CRITERIOS.dimensoes.conta_energia.faixas.find(
    (f) => valor >= f.min && (f.max === null || valor < f.max)
  );
  return faixa?.pontos ?? 0;
}

function scoreOpcao(dimensao: "perfil_imovel" | "autoridade_decisao" | "urgencia", chave: string | null): number {
  if (!chave) return 0;
  const opcao = CRITERIOS.dimensoes[dimensao].opcoes.find((o) => o.chave === chave);
  return opcao?.pontos ?? 0;
}

function classificar(score: number) {
  return CRITERIOS.classificacao.find((c) => score >= c.min && score <= c.max) || CRITERIOS.classificacao[3];
}

// Extrair dados de conversa via regex (sem IA)
export function extrairDadosRegex(conversa: string | null): DadosLead | null {
  if (!conversa) return null;
  const texto = conversa.toLowerCase();

  let valor_conta_energia: number | null = null;
  const matchConta =
    conversa.match(/(?:fatura|conta|pag[ao]|gast[ao]|valor).*?(?:R\$\s*)?(\d[\d.,]*)/i) ||
    conversa.match(/(\d[\d.,]*)\s*(?:reais|por\s*m[eê]s)/i) ||
    conversa.match(/(?:R\$\s*)(\d[\d.,]*)/i);
  if (matchConta) {
    valor_conta_energia = parseFloat(matchConta[1].replace(".", "").replace(",", "."));
  }

  let tipo_imovel: string | null = null;
  if (texto.includes("alugado") || texto.includes("aluguel")) tipo_imovel = "alugado";
  else if (texto.includes("apartamento") && texto.includes("cobertura")) tipo_imovel = "apto_cobertura";
  else if (texto.includes("apartamento")) tipo_imovel = "apto_sem_cobertura";
  else if (
    texto.includes("comercial") ||
    texto.includes("loja") ||
    texto.includes("clínica") ||
    texto.includes("restaurante") ||
    texto.includes("empresa")
  )
    tipo_imovel = "imovel_comercial_proprio";
  else if (texto.includes("laje")) tipo_imovel = "casa_propria_laje";
  else if (texto.includes("combo") || texto.includes("familiar")) tipo_imovel = "combo_familia";
  else if (texto.includes("casa") || texto.includes("residência") || texto.includes("residencia"))
    tipo_imovel = "casa_propria_telhado_convencional";

  let autoridade_decisao: string | null = null;
  if (texto.includes("pesquisando para") || texto.includes("pra outra pessoa")) autoridade_decisao = "nao_decisor";
  else if (texto.includes("sócio") || texto.includes("socio")) autoridade_decisao = "socio_familiar";
  else if (texto.includes("consultar") && (texto.includes("esposa") || texto.includes("marido")))
    autoridade_decisao = "consultar_conjuge";
  else if (texto.includes("casal") || (texto.includes("esposa") && texto.includes("marido")))
    autoridade_decisao = "casal_engajado";

  let urgencia: string | null = null;
  if (texto.includes("orçamento") || texto.includes("comparando") || texto.includes("decidir"))
    urgencia = "comparando_orcamentos";
  else if (texto.includes("pesquisando") && (texto.includes("tempo") || texto.includes("meses")))
    urgencia = "pesquisando_momento";
  else if (texto.includes("começando") || texto.includes("pesquisar") || texto.includes("saber mais"))
    urgencia = "comecando_pesquisar";
  else if (texto.includes("curiosidade") || texto.includes("só saber")) urgencia = "curiosidade";

  const eh_indicacao = texto.includes("indicação") || texto.includes("indicado") || texto.includes("indicou");

  let nome_lead: string | null = null;
  const matchNome = conversa.match(/(?:^|\n)\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)\s*[-–—]/);
  if (matchNome) nome_lead = matchNome[1].trim();

  return { valor_conta_energia, tipo_imovel, autoridade_decisao, urgencia, eh_indicacao, nome_lead };
}

// Calcular score ICP (0-100)
export function calcularScore(dados: DadosLead): ScoreResult {
  const pontos =
    scoreConta(dados.valor_conta_energia) +
    scoreOpcao("perfil_imovel", dados.tipo_imovel) +
    scoreOpcao("autoridade_decisao", dados.autoridade_decisao) +
    scoreOpcao("urgencia", dados.urgencia);

  let cls = classificar(pontos);

  // Indicacao sobe 1 categoria
  if (dados.eh_indicacao) {
    const idx = CRITERIOS.classificacao.findIndex((c) => c.classe === cls.classe);
    if (idx > 0) cls = CRITERIOS.classificacao[idx - 1];
  }

  return { score: pontos, classe: cls.classe, label: cls.label };
}

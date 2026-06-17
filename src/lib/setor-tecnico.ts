// ============================================================
// CONSTANTES DO MODULO SETOR TECNICO
// ============================================================
// O funil cobre duas FASES INDEPENDENTES que rodam em paralelo no mesmo card:
//
//   PROJETO (campo `etapa`)        — etapas administrativas/cartoriais ate
//                                    o projeto ser aprovado.
//   INSTALACAO (campo `etapaInstalacao`) — etapas operacionais da equipe
//                                    de campo, do agendamento ate a rede ligada.
//
// Os trilhos sao 100% independentes — Pedro avanca cada um na hora que quiser.
// Cada card aparece em ambas as abas (Projetos + Instalacoes) desde a criacao.
// Quando uma fase chega ao fim, o card "gradua" pra aba de Concluidos
// correspondente — ver filtros em /app/tecnico/page.tsx.

export type CategoriaEtapa = "PROJETO" | "INSTALACAO";

// ------------------------------------------------------------
// TRILHO PROJETO
// ------------------------------------------------------------
export const ETAPAS_PROJETO = [
  { key: "NOVO_PROJETO",     label: "Novo Projeto",       cor: "sky",     ordem: 1 },
  { key: "CONSULTAR_CARGA",  label: "Consultar Carga",    cor: "amber",   ordem: 2 },
  { key: "AUMENTO_CARGA",    label: "Aumento de Carga",   cor: "orange",  ordem: 3 },
  { key: "EMITIR_TRT",       label: "Emitir TRT",         cor: "violet",  ordem: 4 },
  { key: "LIBERADO_ENVIO",   label: "Liberado pra Envio", cor: "indigo",  ordem: 5 },
  { key: "PROJETO_ENVIADO",  label: "Projeto Enviado",    cor: "cyan",    ordem: 6 },
  { key: "PROJETO_APROVADO", label: "Projeto Aprovado",   cor: "emerald", ordem: 7 },
] as const;

export type EtapaProjeto = (typeof ETAPAS_PROJETO)[number]["key"];

// ------------------------------------------------------------
// TRILHO INSTALACAO
// ------------------------------------------------------------
export const ETAPAS_INSTALACAO = [
  { key: "AGENDAR_VISITA",       label: "Agendar Visita",       cor: "slate",   ordem: 1 },
  { key: "VISITA_AGENDADA",      label: "Visita Agendada",      cor: "teal",    ordem: 2 },
  { key: "VISITA_FEITA",         label: "Visita Feita",         cor: "lime",    ordem: 3 },
  { key: "AGUARDANDO_MATERIAL",  label: "Aguard. Material",     cor: "amber",   ordem: 4 },
  { key: "MATERIAL_ENTREGUE",    label: "Material Entregue",    cor: "emerald", ordem: 5 },
  { key: "INSTALACAO_AGENDADA",  label: "Instal. Agendada",     cor: "blue",    ordem: 6 },
  { key: "MATERIAL_COMPRADO",    label: "Material CA Comprado", cor: "yellow",  ordem: 7 },
  { key: "INSTALACAO_CONCLUIDA", label: "Instal. Concluida",    cor: "purple",  ordem: 8 },
  { key: "SOLICITADO_VISTORIA",  label: "Solicitado Vistoria",  cor: "rose",    ordem: 9 },
  { key: "REDE_LIGADA",          label: "Usina Ligada",         cor: "lime",    ordem: 10 },
] as const;

export type EtapaInstalacao = (typeof ETAPAS_INSTALACAO)[number]["key"];

// ------------------------------------------------------------
// COMPATIBILIDADE — concat das duas listas com `categoria` derivada.
// Mantido pra UIs antigas que ainda usam ETAPAS_SETOR_TECNICO.
// ------------------------------------------------------------
export const ETAPAS_SETOR_TECNICO = [
  ...ETAPAS_PROJETO.map((e) => ({ ...e, categoria: "PROJETO" as CategoriaEtapa })),
  ...ETAPAS_INSTALACAO.map((e) => ({ ...e, ordem: e.ordem + 100, categoria: "INSTALACAO" as CategoriaEtapa })),
] as const;

export type EtapaSetorTecnico = EtapaProjeto | EtapaInstalacao;

// ------------------------------------------------------------
// HELPERS — PROJETO
// ------------------------------------------------------------
export function getLabelProjeto(key: string): string {
  return ETAPAS_PROJETO.find((e) => e.key === key)?.label ?? key;
}

export function getOrdemProjeto(key: string): number {
  return ETAPAS_PROJETO.find((e) => e.key === key)?.ordem ?? 0;
}

export function getProximaEtapaProjeto(key: string): EtapaProjeto | null {
  const atual = ETAPAS_PROJETO.find((e) => e.key === key);
  if (!atual) return null;
  const ultima = ETAPAS_PROJETO[ETAPAS_PROJETO.length - 1].ordem;
  if (atual.ordem >= ultima) return null;
  return (ETAPAS_PROJETO.find((e) => e.ordem === atual.ordem + 1)?.key ?? null) as EtapaProjeto | null;
}

// ------------------------------------------------------------
// HELPERS — INSTALACAO
// ------------------------------------------------------------
export function getLabelInstalacao(key: string): string {
  return ETAPAS_INSTALACAO.find((e) => e.key === key)?.label ?? key;
}

export function getOrdemInstalacao(key: string): number {
  return ETAPAS_INSTALACAO.find((e) => e.key === key)?.ordem ?? 0;
}

export function getProximaEtapaInstalacao(key: string): EtapaInstalacao | null {
  const atual = ETAPAS_INSTALACAO.find((e) => e.key === key);
  if (!atual) return null;
  const ultima = ETAPAS_INSTALACAO[ETAPAS_INSTALACAO.length - 1].ordem;
  if (atual.ordem >= ultima) return null;
  return (ETAPAS_INSTALACAO.find((e) => e.ordem === atual.ordem + 1)?.key ?? null) as EtapaInstalacao | null;
}

// ------------------------------------------------------------
// COMPATIBILIDADE — helpers legacy (mantidos pra evitar quebrar
// outros lugares que ainda chamam por nomes antigos).
// ------------------------------------------------------------
export function getEtapaTecnicoLabel(key: string): string {
  return getLabelProjeto(key) !== key
    ? getLabelProjeto(key)
    : getLabelInstalacao(key);
}

export function getEtapaTecnicoOrdem(key: string): number {
  const cat = getCategoriaEtapa(key);
  return cat === "PROJETO" ? getOrdemProjeto(key) : getOrdemInstalacao(key) + 100;
}

export function getCategoriaEtapa(key: string): CategoriaEtapa {
  return ETAPAS_INSTALACAO.some((e) => e.key === key) ? "INSTALACAO" : "PROJETO";
}

export function getEtapasDeCategoria(cat: CategoriaEtapa) {
  return cat === "PROJETO" ? ETAPAS_PROJETO : ETAPAS_INSTALACAO;
}

export function getProximaEtapaTecnico(key: string): EtapaSetorTecnico | null {
  const cat = getCategoriaEtapa(key);
  return cat === "PROJETO"
    ? (getProximaEtapaProjeto(key) as EtapaSetorTecnico | null)
    : (getProximaEtapaInstalacao(key) as EtapaSetorTecnico | null);
}

// ------------------------------------------------------------
// SYNC PosVenda — agora baseado em etapaInstalacao (so a fase
// operacional faz sentido espelhar pro Yuri ver no PosVenda).
// PosVenda.etapa enum: TRAMITES | AGUARDANDO_MATERIAL | VISITA_TECNICA |
//   AGUARDANDO_VISTORIA | CADASTRAR_APP | ACOMPANHAMENTO_30 | CLIENTE_FINALIZADO |
//   MANUTENCOES
// ------------------------------------------------------------
export function etapaInstalacaoParaPosVenda(key: string): string | null {
  switch (key) {
    case "AGENDAR_VISITA":
      return "TRAMITES";
    case "VISITA_AGENDADA":
    case "VISITA_FEITA":
      return "VISITA_TECNICA";
    case "AGUARDANDO_MATERIAL":
    case "MATERIAL_ENTREGUE":
    case "MATERIAL_COMPRADO":
      return "AGUARDANDO_MATERIAL";
    case "INSTALACAO_AGENDADA":
    case "SOLICITADO_VISTORIA":
      return "AGUARDANDO_VISTORIA";
    case "INSTALACAO_CONCLUIDA":
      return "CADASTRAR_APP";
    case "REDE_LIGADA":
      return "ACOMPANHAMENTO_30";
    default:
      return null;
  }
}

// Compat: nome antigo que ainda eh importado em algum lugar — agora redireciona
// pra logica baseada em etapaInstalacao. Aceita tanto chave de projeto (vai
// retornar null) quanto de instalacao (mapeia).
export function etapaTecnicoParaPosVenda(key: string): string | null {
  return etapaInstalacaoParaPosVenda(key);
}

// ------------------------------------------------------------
// CORES Tailwind por etapa (cobre PROJETO + INSTALACAO)
// ------------------------------------------------------------
export const ETAPA_TECNICO_CORES: Record<string, { bg: string; text: string; border: string }> = {
  // PROJETO
  NOVO_PROJETO:         { bg: "bg-sky-400/10",     text: "text-sky-400",     border: "border-sky-400/30"     },
  CONSULTAR_CARGA:      { bg: "bg-amber-400/10",   text: "text-amber-400",   border: "border-amber-400/30"   },
  AUMENTO_CARGA:        { bg: "bg-orange-400/10",  text: "text-orange-400",  border: "border-orange-400/30"  },
  EMITIR_TRT:           { bg: "bg-violet-400/10",  text: "text-violet-400",  border: "border-violet-400/30"  },
  LIBERADO_ENVIO:       { bg: "bg-indigo-400/10",  text: "text-indigo-400",  border: "border-indigo-400/30"  },
  PROJETO_ENVIADO:      { bg: "bg-cyan-400/10",    text: "text-cyan-400",    border: "border-cyan-400/30"    },
  PROJETO_APROVADO:     { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  // INSTALACAO
  AGENDAR_VISITA:       { bg: "bg-slate-400/10",   text: "text-slate-300",   border: "border-slate-400/30"   },
  VISITA_AGENDADA:      { bg: "bg-teal-400/10",    text: "text-teal-400",    border: "border-teal-400/30"    },
  VISITA_FEITA:         { bg: "bg-lime-400/10",    text: "text-lime-400",    border: "border-lime-400/30"    },
  AGUARDANDO_MATERIAL:  { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "border-amber-500/30"   },
  MATERIAL_ENTREGUE:    { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  INSTALACAO_AGENDADA:  { bg: "bg-blue-400/10",    text: "text-blue-400",    border: "border-blue-400/30"    },
  MATERIAL_COMPRADO:    { bg: "bg-yellow-400/10",  text: "text-yellow-400",  border: "border-yellow-400/30"  },
  INSTALACAO_CONCLUIDA: { bg: "bg-purple-400/10",  text: "text-purple-400",  border: "border-purple-400/30"  },
  SOLICITADO_VISTORIA:  { bg: "bg-rose-400/10",    text: "text-rose-400",    border: "border-rose-400/30"    },
  REDE_LIGADA:          { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-400/50"    },
};

// ------------------------------------------------------------
// Bloqueios comuns (Pedro mencionou: aguardando contrato, debito,
// projeto pendente, etc.). Mantido como esta.
// ------------------------------------------------------------
export const MOTIVOS_BLOQUEIO = [
  { key: "AGUARDANDO_CONTRATO",  label: "Aguardando contrato"   },
  { key: "AGUARDANDO_PAGAMENTO", label: "Cliente em debito"     },
  { key: "AGUARDANDO_PROJETO",   label: "Aguardando projeto"    },
  { key: "AGUARDANDO_VISTORIA",  label: "Aguardando vistoria"   },
  { key: "AGUARDANDO_DOCUMENTO", label: "Aguardando documento"  },
  { key: "OUTRO",                label: "Outro (ver observacao)" },
] as const;

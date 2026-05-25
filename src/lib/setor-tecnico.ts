// ============================================================
// CONSTANTES DO MODULO SETOR TECNICO
// ============================================================
// O funil cobre duas fases:
//   PROJETO (1-7) — etapas administrativas/cartoriais ate o projeto ser aprovado
//   INSTALACAO (8-14) — etapas operacionais ate o sistema estar ligado e gerando
//
// A UI separa as duas fases em abas. A transicao entre fases acontece em
// PROJETO_APROVADO -> VISITA_AGENDADA, momento em que o card vira "responsabilidade"
// do engenheiro de campo (Pedro) ao inves do administrativo.

export type CategoriaEtapa = "PROJETO" | "INSTALACAO";

export const ETAPAS_SETOR_TECNICO = [
  // Fase PROJETO (administrativa)
  { key: "NOVO_PROJETO",         label: "Novo Projeto",       cor: "sky",     ordem: 1,  categoria: "PROJETO"    },
  { key: "CONSULTAR_CARGA",      label: "Consultar Carga",    cor: "amber",   ordem: 2,  categoria: "PROJETO"    },
  { key: "AUMENTO_CARGA",        label: "Aumento de Carga",   cor: "orange",  ordem: 3,  categoria: "PROJETO"    },
  { key: "EMITIR_TRT",           label: "Emitir TRT",         cor: "violet",  ordem: 4,  categoria: "PROJETO"    },
  { key: "LIBERADO_ENVIO",       label: "Liberado pra Envio", cor: "indigo",  ordem: 5,  categoria: "PROJETO"    },
  { key: "PROJETO_ENVIADO",      label: "Projeto Enviado",    cor: "cyan",    ordem: 6,  categoria: "PROJETO"    },
  { key: "PROJETO_APROVADO",     label: "Projeto Aprovado",   cor: "emerald", ordem: 7,  categoria: "PROJETO"    },
  // Fase INSTALACAO (operacional — engenheiro de campo)
  { key: "VISITA_AGENDADA",      label: "Visita Agendada",    cor: "teal",    ordem: 8,  categoria: "INSTALACAO" },
  { key: "VISITA_FEITA",         label: "Visita Feita",       cor: "lime",    ordem: 9,  categoria: "INSTALACAO" },
  { key: "AGUARDANDO_MATERIAL",  label: "Aguard. Material",   cor: "amber",   ordem: 10, categoria: "INSTALACAO" },
  { key: "MATERIAL_COMPRADO",    label: "Material Comprado",  cor: "yellow",  ordem: 11, categoria: "INSTALACAO" },
  { key: "INSTALACAO_AGENDADA",  label: "Instal. Agendada",   cor: "blue",    ordem: 12, categoria: "INSTALACAO" },
  { key: "INSTALACAO_CONCLUIDA", label: "Instal. Concluida",  cor: "purple",  ordem: 13, categoria: "INSTALACAO" },
  { key: "REDE_LIGADA",          label: "Rede Ligada",        cor: "lime",    ordem: 14, categoria: "INSTALACAO" },
] as const;

const ULTIMA_ORDEM = ETAPAS_SETOR_TECNICO[ETAPAS_SETOR_TECNICO.length - 1].ordem;

export type EtapaSetorTecnico = (typeof ETAPAS_SETOR_TECNICO)[number]["key"];

export function getEtapaTecnicoLabel(key: string): string {
  return ETAPAS_SETOR_TECNICO.find((e) => e.key === key)?.label ?? key;
}

export function getEtapaTecnicoOrdem(key: string): number {
  return ETAPAS_SETOR_TECNICO.find((e) => e.key === key)?.ordem ?? 0;
}

export function getCategoriaEtapa(key: string): CategoriaEtapa {
  return (ETAPAS_SETOR_TECNICO.find((e) => e.key === key)?.categoria ?? "PROJETO") as CategoriaEtapa;
}

export function getEtapasDeCategoria(cat: CategoriaEtapa) {
  return ETAPAS_SETOR_TECNICO.filter((e) => e.categoria === cat);
}

export function getProximaEtapaTecnico(key: string): EtapaSetorTecnico | null {
  const atual = ETAPAS_SETOR_TECNICO.find((e) => e.key === key);
  if (!atual || atual.ordem >= ULTIMA_ORDEM) return null;
  return (ETAPAS_SETOR_TECNICO.find((e) => e.ordem === atual.ordem + 1)?.key ?? null) as EtapaSetorTecnico | null;
}

// Map etapa do setor tecnico -> etapa correspondente em PosVenda (sync automatico)
// PosVenda.etapa enum: TRAMITES | AGUARDANDO_MATERIAL | VISITA_TECNICA |
//   AGUARDANDO_VISTORIA | CADASTRAR_APP | ACOMPANHAMENTO_30 | CLIENTE_FINALIZADO |
//   MANUTENCOES
export function etapaTecnicoParaPosVenda(key: string): string | null {
  switch (key) {
    case "VISITA_AGENDADA":
    case "VISITA_FEITA":
      return "VISITA_TECNICA";
    case "AGUARDANDO_MATERIAL":
    case "MATERIAL_COMPRADO":
      return "AGUARDANDO_MATERIAL";
    case "INSTALACAO_AGENDADA":
      return "AGUARDANDO_VISTORIA";
    case "INSTALACAO_CONCLUIDA":
      return "CADASTRAR_APP";
    case "REDE_LIGADA":
      return "ACOMPANHAMENTO_30";
    default:
      return null; // etapas de PROJETO nao espelham (pre-instalacao)
  }
}

// Cores Tailwind por etapa (bg e text)
export const ETAPA_TECNICO_CORES: Record<string, { bg: string; text: string; border: string }> = {
  NOVO_PROJETO:         { bg: "bg-sky-400/10",     text: "text-sky-400",     border: "border-sky-400/30"     },
  CONSULTAR_CARGA:      { bg: "bg-amber-400/10",   text: "text-amber-400",   border: "border-amber-400/30"   },
  AUMENTO_CARGA:        { bg: "bg-orange-400/10",  text: "text-orange-400",  border: "border-orange-400/30"  },
  EMITIR_TRT:           { bg: "bg-violet-400/10",  text: "text-violet-400",  border: "border-violet-400/30"  },
  LIBERADO_ENVIO:       { bg: "bg-indigo-400/10",  text: "text-indigo-400",  border: "border-indigo-400/30"  },
  PROJETO_ENVIADO:      { bg: "bg-cyan-400/10",    text: "text-cyan-400",    border: "border-cyan-400/30"    },
  PROJETO_APROVADO:     { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  VISITA_AGENDADA:      { bg: "bg-teal-400/10",    text: "text-teal-400",    border: "border-teal-400/30"    },
  VISITA_FEITA:         { bg: "bg-lime-400/10",    text: "text-lime-400",    border: "border-lime-400/30"    },
  AGUARDANDO_MATERIAL:  { bg: "bg-amber-500/10",   text: "text-amber-500",   border: "border-amber-500/30"   },
  MATERIAL_COMPRADO:    { bg: "bg-yellow-400/10",  text: "text-yellow-400",  border: "border-yellow-400/30"  },
  INSTALACAO_AGENDADA:  { bg: "bg-blue-400/10",    text: "text-blue-400",    border: "border-blue-400/30"    },
  INSTALACAO_CONCLUIDA: { bg: "bg-purple-400/10",  text: "text-purple-400",  border: "border-purple-400/30"  },
  REDE_LIGADA:          { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-400/50"    },
};

// Bloqueios comuns que travam o avanco da etapa (Pedro mencionou: aguardando
// contrato, debito do cliente, projeto pendente, etc.)
export const MOTIVOS_BLOQUEIO = [
  { key: "AGUARDANDO_CONTRATO",  label: "Aguardando contrato"   },
  { key: "AGUARDANDO_PAGAMENTO", label: "Cliente em debito"     },
  { key: "AGUARDANDO_PROJETO",   label: "Aguardando projeto"    },
  { key: "AGUARDANDO_VISTORIA",  label: "Aguardando vistoria"   },
  { key: "AGUARDANDO_DOCUMENTO", label: "Aguardando documento"  },
  { key: "OUTRO",                label: "Outro (ver observacao)" },
] as const;

// Tipos do payload retornado por /api/cro/overview
// Espelha a estrutura definida em src/app/api/cro/overview/route.ts

export type CanalKey = "trafego" | "indicacao" | "externoDaniel" | "naoClassificado";

export interface CanalAgregado {
  vendas: number;
  receita: number;
  ticketMedio: number;
  percentualReceita: number;
}

export interface VendaSemFonte {
  id: string;
  cliente: string;
  vendedorNome: string;
  dataConversao: string; // ISO
  valorVenda: number;
}

export interface CampanhaMeta {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
  ctr: number;
  cpm: number;
}

export interface CROOverview {
  periodo: {
    startDate: string;
    endDate: string;
    mesAnterior: { startDate: string; endDate: string };
  };
  qualidadeDado: {
    totalVendas: number;
    classificadas: number;
    semFonte: number;
    percentualClassificadas: number;
    vendasSemFonte: VendaSemFonte[];
  };
  canais: Record<CanalKey, CanalAgregado>;
  externoBreakdown: { trafego: number; indicacao: number; semFonte: number };
  comparacaoMesAnterior: Record<
    Exclude<CanalKey, "naoClassificado">,
    {
      vendasDelta: number;
      vendasDeltaPct: number;
      receitaDelta: number;
      receitaDeltaPct: number;
    }
  >;
  metaVsVendas: {
    spendTotal: number;
    leadsTotal: number;
    vendasTrafego: number;
    receitaTrafego: number;
    cplGlobal: number;
    cac: number;
    roas: number;
    taxaConversaoLeadVenda: number;
    porCampanha: CampanhaMeta[];
  };
  alertaConcentracao: {
    exibir: boolean;
    canal: CanalKey | null;
    percentual: number;
  };
  totaisPeriodo: {
    receitaTotal: number;
    vendasTotal: number;
  };
}

export const CANAL_LABEL: Record<CanalKey, string> = {
  trafego: "Tráfego (Meta)",
  indicacao: "Indicação",
  externoDaniel: "Externo Daniel",
  naoClassificado: "Não classificado",
};

// Cores baseadas na paleta LIV (verde sage, areia, off-white) adaptadas pro tema escuro
export const CANAL_COLOR: Record<CanalKey, string> = {
  trafego: "#B7C1AC",        // sage green (LIV)
  indicacao: "#E9E5DC",      // areia (LIV)
  externoDaniel: "#F8F8F6",  // off-white (LIV)
  naoClassificado: "#3A3A3A", // cinza
};

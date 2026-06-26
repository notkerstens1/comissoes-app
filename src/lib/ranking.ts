export interface VendedorVendas {
  id: string;
  nome: string;
  totalVendido: number;
  qtdVendas: number;
  ticketMedio: number;
  margemMedia: number;
}

export interface RankedVendedor extends VendedorVendas {
  posicao: number;
  meta: number;
  progresso: number; // totalVendido / meta (ratio; pode passar de 1)
}

export type LiveEventKind = "sale" | "meta" | "lead";

export interface LiveEvent {
  kind: LiveEventKind;
  id: string;
  nome: string;
  delta: number; // variação de faturamento na nova venda (0 para meta/lead sem venda)
}

/** Ordena por quantidade de vendas (desc); faturamento desempata. */
export function rankByVendas(vendedores: VendedorVendas[], meta: number): RankedVendedor[] {
  return [...vendedores]
    .sort((a, b) => b.qtdVendas - a.qtdVendas || b.totalVendido - a.totalVendido)
    .map((v, i) => ({
      ...v,
      posicao: i + 1,
      meta,
      progresso: meta > 0 ? v.totalVendido / meta : 0,
    }));
}

interface VendedorRef { id: string; nome: string }
interface VendaRef { vendedorId: string; valorVenda: number; margem: number }

export function buildDashboardRanking(vendedores: VendedorRef[], vendas: VendaRef[], meta: number) {
  const agregados: VendedorVendas[] = vendedores.map((v) => {
    const suas = vendas.filter((x) => x.vendedorId === v.id);
    const totalVendido = suas.reduce((s, x) => s + x.valorVenda, 0);
    const qtdVendas = suas.length;
    return {
      id: v.id,
      nome: v.nome,
      totalVendido,
      qtdVendas,
      ticketMedio: qtdVendas > 0 ? totalVendido / qtdVendas : 0,
      margemMedia: qtdVendas > 0 ? suas.reduce((s, x) => s + x.margem, 0) / qtdVendas : 0,
    };
  });

  const ranking = rankByVendas(agregados, meta);
  return {
    ranking,
    totais: {
      totalGeralVendido: ranking.reduce((s, r) => s + r.totalVendido, 0),
      totalGeralVendas: ranking.reduce((s, r) => s + r.qtdVendas, 0),
    },
  };
}

/** Compara dois snapshots e devolve os eventos de celebração. */
export function diffRanking(prev: RankedVendedor[], next: RankedVendedor[]): LiveEvent[] {
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const events: LiveEvent[] = [];

  for (const n of next) {
    const p = prevById.get(n.id);
    if (!p) continue; // sem baseline anterior, não celebra (evita ruído no 1º load)

    if (n.qtdVendas > p.qtdVendas) {
      events.push({ kind: "sale", id: n.id, nome: n.nome, delta: n.totalVendido - p.totalVendido });
    }
    if (p.progresso < 1 && n.progresso >= 1) {
      events.push({ kind: "meta", id: n.id, nome: n.nome, delta: 0 });
    }
    if (p.posicao !== 1 && n.posicao === 1) {
      events.push({ kind: "lead", id: n.id, nome: n.nome, delta: 0 });
    }
  }
  return events;
}

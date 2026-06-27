import { describe, it, expect } from "vitest";
import { rankByVendas, diffRanking, buildDashboardRanking, type VendedorVendas, type RankedVendedor } from "./ranking";

const base = (over: Partial<VendedorVendas> & { id: string }): VendedorVendas => ({
  nome: over.id, totalVendido: 0, qtdVendas: 0, ticketMedio: 0, margemMedia: 0, ...over,
});

describe("rankByVendas", () => {
  it("ordena por quantidade de vendas, faturamento desempata", () => {
    const r = rankByVendas([
      base({ id: "a", qtdVendas: 2, totalVendido: 50000 }),
      base({ id: "b", qtdVendas: 3, totalVendido: 10000 }),
      base({ id: "c", qtdVendas: 2, totalVendido: 90000 }),
    ], 120000);
    expect(r.map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(r.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });

  it("calcula progresso como qtdVendas/meta (meta por quantidade de vendas)", () => {
    const [x] = rankByVendas([base({ id: "a", qtdVendas: 4, totalVendido: 60000 })], 8);
    expect(x.progresso).toBeCloseTo(0.5); // 4 vendas / meta 8
    expect(x.meta).toBe(8);
  });

  it("progresso 0 quando meta é 0", () => {
    const [x] = rankByVendas([base({ id: "a", totalVendido: 1000 })], 0);
    expect(x.progresso).toBe(0);
  });
});

describe("diffRanking", () => {
  const ranked = (over: Partial<RankedVendedor> & { id: string }): RankedVendedor => ({
    nome: over.id, totalVendido: 0, qtdVendas: 0, ticketMedio: 0, margemMedia: 0, posicao: 1, meta: 8, progresso: 0, ...over,
  });

  it("detecta nova venda quando qtdVendas aumenta", () => {
    const prev = [ranked({ id: "a", qtdVendas: 1, totalVendido: 10000, posicao: 1 })];
    const next = [ranked({ id: "a", qtdVendas: 2, totalVendido: 30000, posicao: 1 })];
    const ev = diffRanking(prev, next);
    expect(ev).toEqual([{ kind: "sale", id: "a", nome: "a", delta: 20000 }]);
  });

  it("detecta meta batida quando progresso cruza 1.0", () => {
    const prev = [ranked({ id: "a", qtdVendas: 7, totalVendido: 100000, progresso: 7 / 8, posicao: 1 })];
    const next = [ranked({ id: "a", qtdVendas: 9, totalVendido: 130000, progresso: 9 / 8, posicao: 1 })];
    const ev = diffRanking(prev, next);
    expect(ev.some((e) => e.kind === "meta" && e.id === "a")).toBe(true);
  });

  it("detecta novo líder quando posicao vira 1", () => {
    const prev = [ranked({ id: "a", posicao: 2 }), ranked({ id: "b", posicao: 1 })];
    const next = [ranked({ id: "a", posicao: 1, qtdVendas: 1, totalVendido: 5000 }), ranked({ id: "b", posicao: 2 })];
    const ev = diffRanking(prev, next);
    expect(ev.some((e) => e.kind === "lead" && e.id === "a")).toBe(true);
  });

  it("não emite nada quando nada muda", () => {
    const snap = [ranked({ id: "a", qtdVendas: 1, totalVendido: 10000, posicao: 1 })];
    expect(diffRanking(snap, snap)).toEqual([]);
  });

  it("ignora vendedores ausentes no snapshot anterior", () => {
    const prev: any[] = [];
    const next = [ranked({ id: "a", qtdVendas: 1, totalVendido: 5000, posicao: 1 })];
    expect(diffRanking(prev, next)).toEqual([]);
  });
});

describe("buildDashboardRanking", () => {
  const vendedores = [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bia" }];
  const vendas = [
    { vendedorId: "a", valorVenda: 60000, margem: 1.8 },
    { vendedorId: "a", valorVenda: 60000, margem: 2.0 },
    { vendedorId: "b", valorVenda: 130000, margem: 1.5 },
  ];

  it("agrega vendas, ranqueia por quantidade e calcula meta/progresso (por contagem)", () => {
    const { ranking, totais } = buildDashboardRanking(vendedores, vendas, 2);
    // Ana: 2 vendas / meta 2; Bia: 1 venda / meta 2 → Ana lidera (mais vendas)
    expect(ranking[0].id).toBe("a");
    expect(ranking[0].qtdVendas).toBe(2);
    expect(ranking[0].progresso).toBeCloseTo(1); // 2 vendas / meta 2
    expect(ranking[1].progresso).toBeCloseTo(0.5); // 1 venda / meta 2
    expect(totais.totalGeralVendas).toBe(3);
    expect(totais.totalGeralVendido).toBe(250000);
  });
});

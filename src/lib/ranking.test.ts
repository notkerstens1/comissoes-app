import { describe, it, expect } from "vitest";
import { rankByVendas, diffRanking, type VendedorVendas, type RankedVendedor } from "./ranking";

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

  it("calcula progresso como totalVendido/meta", () => {
    const [x] = rankByVendas([base({ id: "a", qtdVendas: 1, totalVendido: 60000 })], 120000);
    expect(x.progresso).toBeCloseTo(0.5);
    expect(x.meta).toBe(120000);
  });

  it("progresso 0 quando meta é 0", () => {
    const [x] = rankByVendas([base({ id: "a", totalVendido: 1000 })], 0);
    expect(x.progresso).toBe(0);
  });
});

describe("diffRanking", () => {
  const ranked = (over: Partial<RankedVendedor> & { id: string }): RankedVendedor => ({
    nome: over.id, totalVendido: 0, qtdVendas: 0, ticketMedio: 0, margemMedia: 0, posicao: 1, meta: 120000, progresso: 0, ...over,
  });

  it("detecta nova venda quando qtdVendas aumenta", () => {
    const prev = [ranked({ id: "a", qtdVendas: 1, totalVendido: 10000, posicao: 1 })];
    const next = [ranked({ id: "a", qtdVendas: 2, totalVendido: 30000, posicao: 1 })];
    const ev = diffRanking(prev, next);
    expect(ev).toEqual([{ kind: "sale", id: "a", nome: "a", delta: 20000 }]);
  });

  it("detecta meta batida quando progresso cruza 1.0", () => {
    const prev = [ranked({ id: "a", qtdVendas: 1, totalVendido: 100000, progresso: 100000 / 120000, posicao: 1 })];
    const next = [ranked({ id: "a", qtdVendas: 2, totalVendido: 130000, progresso: 130000 / 120000, posicao: 1 })];
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

import { describe, it, expect } from "vitest";
import { buildMetaMes, somarMetasContratos } from "./meta-mes";

describe("somarMetasContratos", () => {
  it("soma as metas individuais dos vendedores", () => {
    // Bruna, Juliana, Pedro, Daniel — todos consolidados (8) = 32
    expect(somarMetasContratos([8, 8, 8, 8], 8)).toBe(32);
  });

  it("usa o default global quando o vendedor nao tem meta propria (null)", () => {
    // 2 consolidados (8) + 1 novato (6) + 1 sem meta (cai no default 8) = 30
    expect(somarMetasContratos([8, 8, 6, null], 8)).toBe(30);
  });

  it("ignora metas invalidas (0 ou negativas) caindo no default", () => {
    expect(somarMetasContratos([0, -5, undefined], 8)).toBe(24);
  });
});

describe("buildMetaMes", () => {
  it("usa a meta de contratos somada e a receita projetada fixa", () => {
    const r = buildMetaMes(32, 500000, 4, []);
    expect(r.meta.vendas).toBe(32);
    expect(r.meta.faturamento).toBe(500000); // projecao fixa, nao derivada
    expect(r.vendedoresAtivos).toBe(4);
  });

  it("separa efetivo (COMPLETO) de a finalizar (A_FINALIZAR)", () => {
    const r = buildMetaMes(32, 500000, 4, [
      { valorVenda: 30000, statusContrato: "COMPLETO" },
      { valorVenda: 20000, statusContrato: "COMPLETO" },
      { valorVenda: 50000, statusContrato: "A_FINALIZAR" },
    ]);
    expect(r.efetivo).toEqual({ vendas: 2, faturamento: 50000 });
    expect(r.aFinalizar).toEqual({ vendas: 1, faturamento: 50000 });
    expect(r.total).toEqual({ vendas: 3, faturamento: 100000 });
  });

  it("trata statusContrato ausente/desconhecido como efetivo (default COMPLETO)", () => {
    const r = buildMetaMes(8, 500000, 1, [
      { valorVenda: 10000, statusContrato: "" },
    ]);
    expect(r.efetivo.vendas).toBe(1);
    expect(r.aFinalizar.vendas).toBe(0);
  });

  it("ignora valorVenda invalido sem quebrar a contagem", () => {
    const r = buildMetaMes(8, 500000, 1, [
      { valorVenda: NaN, statusContrato: "COMPLETO" },
    ]);
    expect(r.efetivo.vendas).toBe(1);
    expect(r.efetivo.faturamento).toBe(0);
  });
});

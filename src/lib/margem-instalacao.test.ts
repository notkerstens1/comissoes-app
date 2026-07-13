import { describe, it, expect } from "vitest";
import { resolverEstimadoMaterialCA, FAIXAS_INVERSOR_CA } from "./margem-instalacao";

const config = {
  custoMaterialCAPadrao: 500,
  custoMaterialCAAte7kw: 550,
  custoMaterialCAAcima7kw: 700,
};

describe("resolverEstimadoMaterialCA", () => {
  it("ATE_7KW resolve para o valor da faixa <= 7 kW", () => {
    expect(resolverEstimadoMaterialCA("ATE_7KW", config)).toBe(550);
  });

  it("ACIMA_7KW resolve para o valor da faixa > 7 kW", () => {
    expect(resolverEstimadoMaterialCA("ACIMA_7KW", config)).toBe(700);
  });

  it("sem faixa (null/undefined/vazio) cai no padrao flat", () => {
    expect(resolverEstimadoMaterialCA(null, config)).toBe(500);
    expect(resolverEstimadoMaterialCA(undefined, config)).toBe(500);
    expect(resolverEstimadoMaterialCA("", config)).toBe(500);
  });

  it("usa os defaults 550/700/500 quando a config nao traz os campos", () => {
    expect(resolverEstimadoMaterialCA("ATE_7KW", {})).toBe(550);
    expect(resolverEstimadoMaterialCA("ACIMA_7KW", {})).toBe(700);
    expect(resolverEstimadoMaterialCA(null, {})).toBe(500);
  });

  it("catalogo tem as 2 faixas esperadas", () => {
    expect(FAIXAS_INVERSOR_CA.map((f) => f.key)).toEqual(["ATE_7KW", "ACIMA_7KW"]);
  });
});

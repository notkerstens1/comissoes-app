import { describe, it, expect } from "vitest";
import { parseEtiquetas, isEtiquetaValida, ETIQUETAS } from "./etiquetas";

describe("etiquetas", () => {
  it("catalogo tem as 3 etiquetas esperadas", () => {
    expect(ETIQUETAS.map((e) => e.key)).toEqual(["FECHADO", "TRAMITACAO", "DEBITO"]);
  });

  it("isEtiquetaValida aceita keys do catalogo e rejeita o resto", () => {
    expect(isEtiquetaValida("FECHADO")).toBe(true);
    expect(isEtiquetaValida("DEBITO")).toBe(true);
    expect(isEtiquetaValida("QUALQUER")).toBe(false);
    expect(isEtiquetaValida("")).toBe(false);
  });

  it("parseEtiquetas devolve [] para null/undefined/invalido", () => {
    expect(parseEtiquetas(null)).toEqual([]);
    expect(parseEtiquetas(undefined)).toEqual([]);
    expect(parseEtiquetas("")).toEqual([]);
    expect(parseEtiquetas("nao-e-json")).toEqual([]);
    expect(parseEtiquetas('{"a":1}')).toEqual([]);
  });

  it("parseEtiquetas mantem so keys validas e descarta lixo", () => {
    expect(parseEtiquetas('["FECHADO","DEBITO"]')).toEqual(["FECHADO", "DEBITO"]);
    expect(parseEtiquetas('["FECHADO","XPTO",123,null]')).toEqual(["FECHADO"]);
  });

  it("suporta multi-select (fechado + debito juntos)", () => {
    const r = parseEtiquetas('["FECHADO","DEBITO"]');
    expect(r).toContain("FECHADO");
    expect(r).toContain("DEBITO");
  });
});

import { describe, it, expect } from "vitest";
import { matchSetorTecnicoVinculado } from "./setor-tecnico-vinculo";

type Setor = {
  id: string;
  vendaId: string | null;
  codigoLocalizador: string | null;
  enderecoInstalacao: string | null;
};

describe("matchSetorTecnicoVinculado", () => {
  const setores: Setor[] = [
    { id: "t1", vendaId: "v1", codigoLocalizador: "1234", enderecoInstalacao: "Rua A, 100" },
    { id: "t2", vendaId: "v2", codigoLocalizador: "5678", enderecoInstalacao: null },
  ];

  it("vincula pelo vendaId quando existe", () => {
    const r = matchSetorTecnicoVinculado({ vendaId: "v1", codigoLocalizador: null }, setores);
    expect(r?.id).toBe("t1");
  });

  it("cai no codigoLocalizador quando nao ha vendaId", () => {
    const r = matchSetorTecnicoVinculado({ vendaId: null, codigoLocalizador: "5678" }, setores);
    expect(r?.id).toBe("t2");
  });

  it("prioriza vendaId sobre codigoLocalizador", () => {
    // codigoLocalizador aponta pra t2, mas vendaId aponta pra t1 — vendaId vence
    const r = matchSetorTecnicoVinculado({ vendaId: "v1", codigoLocalizador: "5678" }, setores);
    expect(r?.id).toBe("t1");
  });

  it("retorna null quando nada casa", () => {
    const r = matchSetorTecnicoVinculado({ vendaId: "vX", codigoLocalizador: "9999" }, setores);
    expect(r).toBeNull();
  });

  it("ignora vendaId nulo nos setores (nao casa null com null)", () => {
    const comNulo: Setor[] = [{ id: "t3", vendaId: null, codigoLocalizador: null, enderecoInstalacao: "x" }];
    const r = matchSetorTecnicoVinculado({ vendaId: null, codigoLocalizador: null }, comNulo);
    expect(r).toBeNull();
  });
});

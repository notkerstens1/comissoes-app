import { describe, it, expect } from "vitest";
import { comissaoVendaPorOrigem } from "./sdr-linking";
import { COMISSAO_VENDA_SDR } from "./sdr";

describe("comissaoVendaPorOrigem", () => {
  it("paga comissao de venda quando a oportunidade veio da SDR", () => {
    expect(comissaoVendaPorOrigem("SDR")).toBe(COMISSAO_VENDA_SDR);
  });

  it("nao paga comissao SDR em auto-prospeccao do vendedor (VENDEDOR)", () => {
    expect(comissaoVendaPorOrigem("VENDEDOR")).toBe(0);
  });
});

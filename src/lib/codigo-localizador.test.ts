import { describe, it, expect, vi } from "vitest";
import { gerarCodigo4, gerarCodigoLocalizadorUnico } from "./codigo-localizador";

describe("gerarCodigo4", () => {
  it("retorna sempre 4 caracteres numericos", () => {
    for (let i = 0; i < 200; i++) {
      expect(gerarCodigo4()).toMatch(/^\d{4}$/);
    }
  });
  it("mantem zero a esquerda (ex: 0007)", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.0007);
    expect(gerarCodigo4()).toBe("0007");
    spy.mockRestore();
  });
});

describe("gerarCodigoLocalizadorUnico", () => {
  it("regenera quando o candidato ja existe em qualquer tabela", async () => {
    const seq = [0.0001, 0.0001, 0.0002];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++]);
    const prisma = {
      setorTecnico: { findFirst: vi.fn(async ({ where }: any) => (where.codigoLocalizador === "0001" ? { id: "x" } : null)) },
      posVenda: { findFirst: vi.fn(async () => null) },
    };
    const code = await gerarCodigoLocalizadorUnico(prisma as any);
    expect(code).toBe("0002");
    vi.restoreAllMocks();
  });
  it("lanca erro apos exceder o teto de tentativas", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // sempre 5000
    const prisma = {
      setorTecnico: { findFirst: vi.fn(async () => ({ id: "x" })) },
      posVenda: { findFirst: vi.fn(async () => null) },
    };
    await expect(gerarCodigoLocalizadorUnico(prisma as any)).rejects.toThrow(/codigo/i);
    vi.restoreAllMocks();
  });
});

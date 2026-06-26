import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLiveRanking } from "./use-live-ranking";

const mk = (ranking: any[], meta = 120000) => ({
  ranking, meta, geradoEm: "2026-06-25T00:00:00Z",
  totais: { totalGeralVendido: 0, totalGeralVendas: 0 },
});

describe("useLiveRanking", () => {
  it("carrega o snapshot inicial sem emitir eventos", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      mk([{ id: "a", nome: "Ana", posicao: 1, qtdVendas: 1, totalVendido: 10000, ticketMedio: 10000, margemMedia: 1.8, meta: 120000, progresso: 10000 / 120000 }]),
    );
    const { result } = renderHook(() => useLiveRanking({ inicio: "x", fim: "y", fetcher }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ranking).toHaveLength(1);
    expect(result.current.events).toEqual([]);
  });

  it("emite evento de venda quando o segundo fetch traz qtdVendas maior", async () => {
    const first = mk([{ id: "a", nome: "Ana", posicao: 1, qtdVendas: 1, totalVendido: 10000, ticketMedio: 10000, margemMedia: 1.8, meta: 120000, progresso: 10000 / 120000 }]);
    const second = mk([{ id: "a", nome: "Ana", posicao: 1, qtdVendas: 2, totalVendido: 30000, ticketMedio: 15000, margemMedia: 1.8, meta: 120000, progresso: 30000 / 120000 }]);
    const fetcher = vi.fn().mockResolvedValueOnce(first).mockResolvedValue(second);

    const { result } = renderHook(() => useLiveRanking({ inicio: "x", fim: "y", intervalMs: 10, alwaysOn: true, fetcher }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.events.some((e) => e.kind === "sale")).toBe(true));

    act(() => result.current.consume());
    expect(result.current.events).toEqual([]);
  });
});

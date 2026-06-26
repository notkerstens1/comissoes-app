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

  it("descarta resolução stale após troca de período (sem evento fantasma)", async () => {
    // Fetcher determinístico: guarda um resolver por chamada. Nada resolve até comandarmos.
    const pending: Array<{ url: string; resolve: (p: any) => void }> = [];
    const fetcher = vi.fn(
      (url: string) =>
        new Promise<any>((resolve) => {
          pending.push({ url, resolve });
        }),
    );

    // Período "semana" — alto volume (qtdVendas 5). Vai ficar pendente.
    const semana = mk([{ id: "a", nome: "Ana", posicao: 1, qtdVendas: 5, totalVendido: 50000, ticketMedio: 10000, margemMedia: 1.8, meta: 120000, progresso: 50000 / 120000 }]);
    // Período "mes" — baseline diferente (qtdVendas 1).
    const mes = mk([{ id: "a", nome: "Ana", posicao: 1, qtdVendas: 1, totalVendido: 10000, ticketMedio: 10000, margemMedia: 1.8, meta: 120000, progresso: 10000 / 120000 }]);

    const { result, rerender } = renderHook(
      ({ inicio, fim }) => useLiveRanking({ inicio, fim, alwaysOn: true, fetcher }),
      { initialProps: { inicio: "s1", fim: "s2" } },
    );

    // 1ª chamada disparada para o período "semana" — ainda pendente.
    await waitFor(() => expect(pending.length).toBe(1));
    expect(pending[0].url).toContain("inicio=s1");

    // Troca de período ANTES da 1ª resolver — bump de geração + nova chamada.
    rerender({ inicio: "m1", fim: "m2" });
    await waitFor(() => expect(pending.length).toBe(2));
    const novaChamada = pending.find((p) => p.url.includes("inicio=m1"))!;
    const chamadaStale = pending.find((p) => p.url.includes("inicio=s1"))!;

    // Resolve PRIMEIRO o novo período (estabelece baseline mes: qtdVendas 1).
    await act(async () => {
      novaChamada.resolve(mes);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ranking).toEqual(mes.ranking);

    // Agora resolve a chamada STALE da semana (qtdVendas 5) — deve ser descartada.
    await act(async () => {
      chamadaStale.resolve(semana);
    });

    // Sem evento fantasma; ranking permanece o do novo período.
    expect(result.current.events).toEqual([]);
    expect(result.current.ranking).toEqual(mes.ranking);
  });
});

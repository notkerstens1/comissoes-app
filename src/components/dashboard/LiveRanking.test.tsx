import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LiveRanking } from "./LiveRanking";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      inicio: "x", fim: "y", meta: 120000, geradoEm: "2026-06-25T00:00:00Z",
      totais: { totalGeralVendido: 30000, totalGeralVendas: 2 },
      ranking: [
        { id: "a", nome: "Ana", posicao: 1, qtdVendas: 2, totalVendido: 30000, ticketMedio: 15000, margemMedia: 1.9, meta: 120000, progresso: 0.25 },
      ],
    }),
  }));
});

describe("LiveRanking", () => {
  it("renderiza o título e o vendedor após carregar", async () => {
    render(<LiveRanking inicio="x" fim="y" />);
    expect(screen.getByText("Ranking ao vivo")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
  });
});

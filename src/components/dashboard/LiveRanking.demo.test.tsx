import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LiveRanking } from "./LiveRanking";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      inicio: "x", fim: "y", meta: 120000, geradoEm: "2026-06-25T00:00:00Z",
      totais: { totalGeralVendido: 30000, totalGeralVendas: 2 },
      ranking: [{ id: "a", nome: "Ana", posicao: 1, qtdVendas: 2, totalVendido: 30000, ticketMedio: 15000, margemMedia: 1.9, meta: 120000, progresso: 0.25 }],
    }),
  }));
});

describe("LiveRanking demo", () => {
  it("mostra o botão Simular venda só em modo demo", async () => {
    const { rerender } = render(<LiveRanking inicio="x" fim="y" />);
    await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
    expect(screen.queryByText("Simular venda")).toBeNull();

    rerender(<LiveRanking inicio="x" fim="y" demo />);
    expect(screen.getByText("Simular venda")).toBeInTheDocument();
  });

  it("clicar em Simular venda dispara um toast", async () => {
    render(<LiveRanking inicio="x" fim="y" demo />);
    await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Simular venda"));
    await waitFor(() => expect(screen.getByText(/registrou|bateu a meta|novo líder/i)).toBeInTheDocument());
  });
});

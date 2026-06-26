import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renderiza eyebrow, título, subtítulo e ações", () => {
    render(
      <PageHeader eyebrow="Diretoria" title="Painel Financeiro" subtitle="Junho 2026" actions={<button>Exportar</button>} />,
    );
    expect(screen.getByText("Diretoria")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Painel Financeiro" })).toBeInTheDocument();
    expect(screen.getByText("Junho 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });
});

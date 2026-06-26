import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Ana", email: "ana@liv.com", role: "VENDEDOR" } } }),
  signOut: vi.fn(),
}));

import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renderiza a marca e o nome do usuário", () => {
    render(<Sidebar />);
    expect(screen.getByText("LIV Energia")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("marca o link ativo (pathname atual) com a classe sage", () => {
    render(<Sidebar />);
    const ativo = screen.getByRole("link", { name: /Dashboard/i });
    expect(ativo.className).toMatch(/liv-sage/);
  });

  it("não usa cores do template antigo (lime/azul-marinho)", () => {
    const { container } = render(<Sidebar />);
    expect(container.innerHTML).not.toMatch(/lime-|#0b0f19|#141820|#232a3b/);
  });
});

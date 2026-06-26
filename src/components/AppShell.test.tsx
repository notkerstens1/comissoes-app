import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/dashboard" }));
let sessionState: { data: unknown; status: string } = { data: null, status: "loading" };
vi.mock("next-auth/react", () => ({
  useSession: () => sessionState,
  signOut: vi.fn(),
}));

import { AppShell } from "./AppShell";

beforeEach(() => { push.mockClear(); });

describe("AppShell", () => {
  it("mostra spinner enquanto carrega", () => {
    sessionState = { data: null, status: "loading" };
    const { container } = render(<AppShell><div>conteúdo</div></AppShell>);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(screen.queryByText("conteúdo")).toBeNull();
  });

  it("renderiza children quando autenticado e sem guard", () => {
    sessionState = { data: { user: { role: "VENDEDOR", name: "Ana" } }, status: "authenticated" };
    render(<AppShell><div>conteúdo</div></AppShell>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("redireciona quando o guard reprova o papel", () => {
    sessionState = { data: { user: { role: "VENDEDOR", name: "Ana" } }, status: "authenticated" };
    render(<AppShell guard={(r) => r === "ADMIN"}><div>secreto</div></AppShell>);
    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByText("secreto")).toBeNull();
  });

  it("usa deniedRedirect customizado", () => {
    sessionState = { data: { user: { role: "FINANCEIRO", name: "Yuri" } }, status: "authenticated" };
    render(<AppShell guard={(r) => r !== "FINANCEIRO"} deniedRedirect="/financeiro"><div>cro</div></AppShell>);
    expect(push).toHaveBeenCalledWith("/financeiro");
  });
});

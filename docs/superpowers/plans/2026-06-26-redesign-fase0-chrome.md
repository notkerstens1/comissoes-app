# Redesign Fase 0 — Chrome compartilhado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrar o chrome compartilhado (Sidebar + 14 layouts + um page-shell) do template antigo pro design system LIV, sem regressão de auth/role-gating.

**Architecture:** Um `AppShell` client DRYa os 14 layouts (auth + guard + Sidebar + main `liv-bg`). O `Sidebar` é reskinnado pros tokens `liv-*` com acento sage único. Um `PageHeader` primitivo padroniza o topo das telas pras ondas seguintes.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind (tokens `liv-*`), next-auth, lucide-react, vitest + @testing-library/react.

## Global Constraints

- Acento único = **sage**; estado ativo de nav consistente em `bg-liv-sage/14 text-liv-sage`. Sem cores neon de seção (`.impeccable.md` 60/30/10).
- Tokens `liv-*` são source of truth; **zero** hex cravado novo. Proibido no chrome: `#0b0f19`, `#141820`, `#232a3b`, `lime-*`, `text-gray-*`, `*-400/10` neon por papel.
- **Role-gating preservado 1:1** — cada predicado de layout replicado exatamente. Um guard afrouxado = vazamento num sistema vivo.
- Sidebar largura `w-64` (alinha com `lg:ml-64` do main). Sidebar `bg-liv-surface`, main `bg-liv-bg`.
- `/telao` não usa Sidebar — não tocar.
- Papel do usuário exibido via `<Badge variant=...>` (tons contidos), não fundo neon.
- Commits em português + trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

### Mapa de guards dos 14 layouts (verbatim — usar na Task 3)
| Layout | guard (predicado sobre `role`) | deniedRedirect |
|---|---|---|
| `dashboard` | (nenhum — só sessão) | — |
| `calculadora` | (só sessão) | — |
| `comissoes` | (só sessão) | — |
| `vendas` | (só sessão) | — |
| `vendedor` | (só sessão) | — |
| `admin` | `isAdmin(r)` | `/dashboard` |
| `performance` | `isAdmin(r)` | `/dashboard` |
| `diretor` | `isDiretor(r)` | `/dashboard` |
| `financeiro` | `canAccessFinanceiro(r)` | `/dashboard` |
| `pos-venda` | `canAccessOperacao(r)` | `/dashboard` |
| `sdr` | `isSDR(r) || isAdmin(r)` | `/dashboard` |
| `supervisor` | `canViewSupervisorCommission(r)` | `/dashboard` |
| `revenue` | `r !== "FINANCEIRO"` (qualquer autenticado exceto financeiro) | `/financeiro` |

---

### Task 1: Primitiva `PageHeader`

**Files:**
- Create: `src/components/ui/page-header.tsx`
- Create: `src/components/ui/page-header.test.tsx`

**Interfaces:**
- Produces: `PageHeader({ eyebrow?, title, subtitle?, actions?, className? })`.

- [ ] **Step 1: Teste — `src/components/ui/page-header.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/page-header.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `src/components/ui/page-header.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">{eyebrow}</p>
        )}
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-liv-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-liv-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/page-header.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/page-header.tsx src/components/ui/page-header.test.tsx
git commit -m "feat(ui): primitiva PageHeader

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Componente `AppShell`

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/AppShell.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` (existente), `next-auth/react` `useSession`, `next/navigation` `useRouter`.
- Produces: `AppShell({ guard?: (role?: string) => boolean; deniedRedirect?: string; children })`.

- [ ] **Step 1: Teste — `src/components/AppShell.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/AppShell.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `src/components/AppShell.tsx`**

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";

interface AppShellProps {
  guard?: (role?: string) => boolean;
  deniedRedirect?: string;
  children: React.ReactNode;
}

export function AppShell({ guard, deniedRedirect = "/dashboard", children }: AppShellProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const denied = !!guard && status === "authenticated" && !guard(role);

  React.useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    else if (denied) router.push(deniedRedirect);
  }, [status, denied, deniedRedirect, router]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-liv-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-liv-line border-t-liv-sage" />
      </div>
    );
  }

  if (!session || denied) return null;

  return (
    <div className="min-h-screen bg-liv-bg">
      <Sidebar />
      <main className="p-6 lg:ml-64 lg:p-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/AppShell.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` (clean), then:
```bash
git add src/components/AppShell.tsx src/components/AppShell.test.tsx
git commit -m "feat(chrome): AppShell compartilhado (auth + guard + sidebar + main liv)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Migrar os 14 layouts pro `AppShell`

**Files:**
- Modify (todos): `src/app/{dashboard,calculadora,comissoes,vendas,vendedor,admin,performance,diretor,financeiro,pos-venda,sdr,supervisor,revenue}/layout.tsx`

**Interfaces:**
- Consumes: `AppShell` (Task 2), guards de `@/lib/roles`.

- [ ] **Step 1: Reescrever cada layout como casca fina do AppShell**

Para cada layout, substituir TODO o conteúdo pelo padrão abaixo, usando o guard da tabela "Mapa de guards" (Global Constraints). Exemplos exatos:

`src/app/dashboard/layout.tsx` (só sessão):
```tsx
"use client";
import { AppShell } from "@/components/AppShell";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```
Idêntico (só sessão) para: `calculadora`, `comissoes`, `vendas`, `vendedor` (trocar o nome da função `XLayout`).

`src/app/admin/layout.tsx`:
```tsx
"use client";
import { AppShell } from "@/components/AppShell";
import { isAdmin } from "@/lib/roles";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => isAdmin(r)}>{children}</AppShell>;
}
```
Mesma forma, trocando guard/nome:
- `performance` → `guard={(r) => isAdmin(r)}` (`import { isAdmin }`)
- `diretor` → `guard={(r) => isDiretor(r)}` (`import { isDiretor }`)
- `financeiro` → `guard={(r) => canAccessFinanceiro(r)}` (`import { canAccessFinanceiro }`)
- `pos-venda` → `guard={(r) => canAccessOperacao(r)}` (`import { canAccessOperacao }`)
- `sdr` → `guard={(r) => isSDR(r) || isAdmin(r)}` (`import { isSDR, isAdmin }`)
- `supervisor` → `guard={(r) => canViewSupervisorCommission(r)}` (`import { canViewSupervisorCommission }`)

`src/app/revenue/layout.tsx` (caso especial — financeiro vai pra /financeiro):
```tsx
"use client";
import { AppShell } from "@/components/AppShell";
export default function RevenueLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => r !== "FINANCEIRO"} deniedRedirect="/financeiro">{children}</AppShell>;
}
```

> Conferir cada guard contra o layout original antes de substituir (a tabela foi extraída verbatim, mas validar). Não inventar guard. Se algum layout tiver uma condição que não bate com a tabela, PARAR e reportar (DONE_WITH_CONCERNS) em vez de adivinhar.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros (todos os imports de `@/lib/roles` resolvidos; funções existem — `isAdmin, isDiretor, isSDR, canAccessFinanceiro, canAccessOperacao, canViewSupervisorCommission`).

- [ ] **Step 3: Build (catch de boundary RSC)**

Run: `npm run build`
Expected: sucesso; todas as rotas compilam.

- [ ] **Step 4: Verificação manual rápida**

Run: `npm run dev`. Logar e abrir `/dashboard`, `/admin` (como admin), `/sdr`. Confirmar: shell `bg-liv-bg`, sidebar presente, conteúdo renderiza, e que um papel sem acesso é redirecionado (ex: vendedor tentando `/admin` → volta pra `/dashboard`).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/calculadora/layout.tsx src/app/comissoes/layout.tsx src/app/vendas/layout.tsx src/app/vendedor/layout.tsx src/app/admin/layout.tsx src/app/performance/layout.tsx src/app/diretor/layout.tsx src/app/financeiro/layout.tsx src/app/pos-venda/layout.tsx src/app/sdr/layout.tsx src/app/supervisor/layout.tsx src/app/revenue/layout.tsx
git commit -m "refactor(chrome): 14 layouts usam AppShell (DRY + tema liv, guards preservados)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Redesign do `Sidebar`

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Create: `src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `Badge` (`@/components/ui/badge`, variants gold/violet/info/orange/teal/sage), `cn`, `usePathname`, `useSession`, `signOut`, lucide icons.

- [ ] **Step 1: Teste — `src/components/Sidebar.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/Sidebar.test.tsx`
Expected: FAIL (classe ativa não é sage / contém lime no estado atual).

- [ ] **Step 3: Reskinnar `src/components/Sidebar.tsx`**

Mudanças (preservar TODA a estrutura de menus, role-gating e links — só trocar a aparência):
1. `aside`: `bg-liv-surface border-r border-liv-line` (era `bg-[#141820] border-[#232a3b]`). Manter `w-64`, fixed, transição de drawer.
2. Toggle mobile: `bg-liv-surface border border-liv-line text-liv-muted`.
3. Marca (logo): trocar o quadrado `bg-lime-400`+Sun pelo monograma — quadrado `rounded-xl bg-liv-sage` com a marca em `text-liv-bg`. Manter um ícone simples dentro (pode ser `Sun` em `text-liv-bg`, ou as duas barras do monograma). Título `text-liv-ink`, subtítulo `text-liv-faint`.
4. Bloco do usuário: nome `text-liv-ink`, email `text-liv-faint`. Trocar o `getRoleBadge()` (que retorna classes neon) por `<Badge variant={tone}>{label}</Badge>` com o mapa:
   - diretor → `gold` · admin → `violet` · supervisor → `violet` · sdr → `info` · posVenda → `orange` · tecnico → `teal` · financeiro → `sage` · vendedor (default) → `sage`.
5. `renderMenuSection`: remover os parâmetros `activeColor`/`activeBg` por-papel. Item:
   - base: `text-liv-muted hover:bg-liv-surface-2 hover:text-liv-ink`
   - ativo (`pathname === item.href`): `bg-liv-sage/14 text-liv-sage`
   Ajustar TODAS as chamadas de `renderMenuSection(...)` que hoje passam cores (remover os 2 args de cor).
6. Rótulos de seção (os `<p>` "Vendedor", "Setor Técnico", "SDR", etc.): trocar as cores neon (`text-teal-400`, `text-sky-400`, `text-amber-400`, `text-lime-400`, `text-purple-400`, `text-fuchsia-400`, `text-emerald-400`, `text-orange-400`, `text-gray-500`) todas por `text-liv-faint`.
7. Separadores: `border-t border-liv-line` (era `border-[#232a3b]`).
8. Logout: `text-liv-danger hover:bg-liv-danger/10` (era `text-red-400 hover:bg-red-400/10`).
9. Garantir que NENHUM `lime-`, `#0b0f19`, `#141820`, `#232a3b`, `text-gray-*`, ou `*-400/10` por papel reste no arquivo.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/Sidebar.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Suíte + typecheck + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: tudo verde/sucesso.

- [ ] **Step 6: Verificação manual**

Run: `npm run dev`. Conferir o sidebar logado como vendedor, admin e diretor: monograma sage, item ativo sage, badge de papel contido, sem neon. Conferir o drawer no mobile (janela estreita).

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat(chrome): Sidebar no design system LIV (monograma sage, ativo sage, papeis via Badge)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (autor do plano)

**Spec coverage:** Sidebar redesign → Task 4 ✓ · AppShell DRY → Task 2 ✓ · 14 layouts migrados c/ guard 1:1 → Task 3 (tabela verbatim) ✓ · PageHeader → Task 1 ✓ · acento sage único / sem neon → Task 4 (passos 5-9 + teste anti-neon) ✓ · sem hex cravado → constraints + teste ✓.

**Placeholder scan:** sem TODO/TBD. Guards são valores concretos da tabela. O caso especial revenue (deniedRedirect /financeiro) está explícito em Task 2 (param) e Task 3.

**Type consistency:** `AppShell({ guard, deniedRedirect, children })` definido na Task 2 e usado exatamente assim na Task 3. Badge `variant` (gold/violet/info/orange/teal/sage) já existe (Task 10 do ciclo anterior). Funções de role (`isAdmin/isDiretor/isSDR/canAccessFinanceiro/canAccessOperacao/canViewSupervisorCommission`) confirmadas em `@/lib/roles`.

**Riscos a confirmar na execução:** (Task 3 Step 1) validar cada guard contra o layout original antes de trocar — se divergir da tabela, parar. (Task 4) não alterar nenhum `href`/estrutura de menu, só aparência.

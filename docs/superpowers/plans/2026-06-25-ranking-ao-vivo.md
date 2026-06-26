# Ranking ao Vivo + Design System LIV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir o design system LIV do handoff dentro do comissoes-app e entregar o Ranking ao Vivo com Modo Telão ligado a dados reais via polling.

**Architecture:** Lógica pura de ranking/diff em `src/lib/ranking.ts` (TDD com vitest). Primitivas dark em `src/components/ui/` no padrão CVA já existente. Ranking ao Vivo em `src/components/dashboard/` consumindo um hook `useLiveRanking` que faz polling de `/api/dashboard/ranking` e faz diff de snapshots pra disparar celebrações. Modo Telão é uma rota dedicada de tela cheia.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind (tokens OKLCH `liv-*`), Prisma, next-auth, lucide-react, class-variance-authority, vitest + @testing-library/react (novo).

## Global Constraints

- **Ranking ordena por quantidade de vendas**; faturamento (`totalVendido`) desempata. (`.impeccable.md` princípio 2)
- **Meta é em R$:** `config.metaVendasMes` (default `120000`). `progresso = totalVendido / meta`. "Bateu a meta" = progresso cruzou `1.0`.
- **Dados reais only em produção.** Nenhum valor fictício fora do modo demo (`?demo=1`).
- **Tokens:** OKLCH `liv-*` em `globals.css` é source of truth; só adicionar o que falta.
- **Motion:** tudo respeita `prefers-reduced-motion` — estados finais sempre visíveis (entrada por estado, nunca `animation … both` com keyframe que começa oculto).
- **Copy LIV:** sereno, sem urgência artificial, sem emoji, dinheiro `R$ 1.234,56`.
- **Não tocar** `/diretor/ranking` nem a invariante `comissaoTotal`.
- Commits frequentes, em português, com trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Lógica pura de ranking + diff + setup de testes

**Files:**
- Create: `src/lib/ranking.ts`
- Create: `src/lib/ranking.test.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `src/lib/utils.ts` (adicionar `getInitials`)
- Create: `src/lib/utils.test.ts`
- Modify: `package.json` (devDeps + script `test`)

**Interfaces:**
- Produces:
  - `interface VendedorVendas { id: string; nome: string; totalVendido: number; qtdVendas: number; ticketMedio: number; margemMedia: number }`
  - `interface RankedVendedor extends VendedorVendas { posicao: number; meta: number; progresso: number }`
  - `rankByVendas(vendedores: VendedorVendas[], meta: number): RankedVendedor[]`
  - `type LiveEventKind = "sale" | "meta" | "lead"`
  - `interface LiveEvent { kind: LiveEventKind; id: string; nome: string; delta: number }`
  - `diffRanking(prev: RankedVendedor[], next: RankedVendedor[]): LiveEvent[]`
  - `getInitials(name: string): string` (em `utils.ts`)

- [ ] **Step 1: Instalar dependências de teste**

Run:
```bash
npm i -D vitest@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25 @vitejs/plugin-react@^4
```
Expected: instala sem erro.

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Criar `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Adicionar script de teste em `package.json`**

No bloco `"scripts"`, adicionar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Escrever o teste que falha — `src/lib/ranking.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { rankByVendas, diffRanking, type VendedorVendas } from "./ranking";

const base = (over: Partial<VendedorVendas> & { id: string }): VendedorVendas => ({
  nome: over.id, totalVendido: 0, qtdVendas: 0, ticketMedio: 0, margemMedia: 0, ...over,
});

describe("rankByVendas", () => {
  it("ordena por quantidade de vendas, faturamento desempata", () => {
    const r = rankByVendas([
      base({ id: "a", qtdVendas: 2, totalVendido: 50000 }),
      base({ id: "b", qtdVendas: 3, totalVendido: 10000 }),
      base({ id: "c", qtdVendas: 2, totalVendido: 90000 }),
    ], 120000);
    expect(r.map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(r.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });

  it("calcula progresso como totalVendido/meta", () => {
    const [x] = rankByVendas([base({ id: "a", qtdVendas: 1, totalVendido: 60000 })], 120000);
    expect(x.progresso).toBeCloseTo(0.5);
    expect(x.meta).toBe(120000);
  });

  it("progresso 0 quando meta é 0", () => {
    const [x] = rankByVendas([base({ id: "a", totalVendido: 1000 })], 0);
    expect(x.progresso).toBe(0);
  });
});

describe("diffRanking", () => {
  const ranked = (over: Partial<Rankedish> & { id: string }) => {
    return { nome: over.id, totalVendido: 0, qtdVendas: 0, ticketMedio: 0, margemMedia: 0, posicao: 1, meta: 120000, progresso: 0, ...over } as any;
  };
  type Rankedish = ReturnType<typeof ranked>;

  it("detecta nova venda quando qtdVendas aumenta", () => {
    const prev = [ranked({ id: "a", qtdVendas: 1, totalVendido: 10000, posicao: 1 })];
    const next = [ranked({ id: "a", qtdVendas: 2, totalVendido: 30000, posicao: 1 })];
    const ev = diffRanking(prev, next);
    expect(ev).toEqual([{ kind: "sale", id: "a", nome: "a", delta: 20000 }]);
  });

  it("detecta meta batida quando progresso cruza 1.0", () => {
    const prev = [ranked({ id: "a", qtdVendas: 1, totalVendido: 100000, progresso: 100000 / 120000, posicao: 1 })];
    const next = [ranked({ id: "a", qtdVendas: 2, totalVendido: 130000, progresso: 130000 / 120000, posicao: 1 })];
    const ev = diffRanking(prev, next);
    expect(ev.some((e) => e.kind === "meta" && e.id === "a")).toBe(true);
  });

  it("detecta novo líder quando posicao vira 1", () => {
    const prev = [ranked({ id: "a", posicao: 2 }), ranked({ id: "b", posicao: 1 })];
    const next = [ranked({ id: "a", posicao: 1, qtdVendas: 1, totalVendido: 5000 }), ranked({ id: "b", posicao: 2 })];
    const ev = diffRanking(prev, next);
    expect(ev.some((e) => e.kind === "lead" && e.id === "a")).toBe(true);
  });

  it("não emite nada quando nada muda", () => {
    const snap = [ranked({ id: "a", qtdVendas: 1, totalVendido: 10000, posicao: 1 })];
    expect(diffRanking(snap, snap)).toEqual([]);
  });

  it("ignora vendedores ausentes no snapshot anterior", () => {
    const prev: any[] = [];
    const next = [ranked({ id: "a", qtdVendas: 1, totalVendido: 5000, posicao: 1 })];
    expect(diffRanking(prev, next)).toEqual([]);
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- src/lib/ranking.test.ts`
Expected: FAIL — `Cannot find module './ranking'`.

- [ ] **Step 7: Implementar `src/lib/ranking.ts`**

```ts
export interface VendedorVendas {
  id: string;
  nome: string;
  totalVendido: number;
  qtdVendas: number;
  ticketMedio: number;
  margemMedia: number;
}

export interface RankedVendedor extends VendedorVendas {
  posicao: number;
  meta: number;
  progresso: number; // totalVendido / meta (ratio; pode passar de 1)
}

export type LiveEventKind = "sale" | "meta" | "lead";

export interface LiveEvent {
  kind: LiveEventKind;
  id: string;
  nome: string;
  delta: number; // variação de faturamento na nova venda (0 para meta/lead sem venda)
}

/** Ordena por quantidade de vendas (desc); faturamento desempata. */
export function rankByVendas(vendedores: VendedorVendas[], meta: number): RankedVendedor[] {
  return [...vendedores]
    .sort((a, b) => b.qtdVendas - a.qtdVendas || b.totalVendido - a.totalVendido)
    .map((v, i) => ({
      ...v,
      posicao: i + 1,
      meta,
      progresso: meta > 0 ? v.totalVendido / meta : 0,
    }));
}

/** Compara dois snapshots e devolve os eventos de celebração. */
export function diffRanking(prev: RankedVendedor[], next: RankedVendedor[]): LiveEvent[] {
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const events: LiveEvent[] = [];

  for (const n of next) {
    const p = prevById.get(n.id);
    if (!p) continue; // sem baseline anterior, não celebra (evita ruído no 1º load)

    if (n.qtdVendas > p.qtdVendas) {
      events.push({ kind: "sale", id: n.id, nome: n.nome, delta: n.totalVendido - p.totalVendido });
    }
    if (p.progresso < 1 && n.progresso >= 1) {
      events.push({ kind: "meta", id: n.id, nome: n.nome, delta: 0 });
    }
    if (p.posicao !== 1 && n.posicao === 1) {
      events.push({ kind: "lead", id: n.id, nome: n.nome, delta: 0 });
    }
  }
  return events;
}
```

- [ ] **Step 8: Escrever o teste de `getInitials` — `src/lib/utils.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getInitials } from "./utils";

describe("getInitials", () => {
  it("usa primeira e última palavra", () => {
    expect(getInitials("Marina Andrade")).toBe("MA");
  });
  it("nome único vira uma letra", () => {
    expect(getInitials("Erick")).toBe("E");
  });
  it("string vazia vira string vazia", () => {
    expect(getInitials("   ")).toBe("");
  });
});
```

- [ ] **Step 9: Rodar e ver falhar**

Run: `npm test -- src/lib/utils.test.ts`
Expected: FAIL — `getInitials is not a function`.

- [ ] **Step 10: Implementar `getInitials` em `src/lib/utils.ts`**

Adicionar ao final do arquivo:
```ts
/** Iniciais a partir do nome: primeira + última palavra, maiúsculas. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
```

- [ ] **Step 11: Rodar toda a suíte**

Run: `npm test`
Expected: PASS — todos os testes verdes.

- [ ] **Step 12: Commit**

```bash
git add src/lib/ranking.ts src/lib/ranking.test.ts src/lib/utils.ts src/lib/utils.test.ts vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "feat(ranking): logica pura de ranking e diff + setup vitest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Design tokens (status tones + glows + motion)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `src/app/globals.tokens.test.ts`

**Interfaces:**
- Produces: classes Tailwind `text-liv-{info,teal,violet,orange}` e CSS vars `--ease-out`, `--ease-emphasized`, `--dur-fast/base/slow`, `--glow-gold`, `--glow-sage`.

- [ ] **Step 1: Teste de regressão dos tokens — `src/app/globals.tokens.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const css = readFileSync(path.resolve(__dirname, "globals.css"), "utf8");

describe("design tokens", () => {
  it.each([
    "--liv-info", "--liv-teal", "--liv-violet", "--liv-orange",
    "--ease-out", "--ease-emphasized", "--dur-base", "--glow-gold", "--glow-sage",
  ])("define %s", (token) => {
    expect(css).toContain(token);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/globals.tokens.test.ts`
Expected: FAIL — tokens ausentes.

- [ ] **Step 3: Adicionar tokens em `src/app/globals.css`**

Dentro do `:root` existente (após `--liv-danger`), adicionar:
```css
    /* status tones extra (OKLCH L C H) */
    --liv-info:   0.70 0.130 250;   /* azul info */
    --liv-teal:   0.78 0.110 180;   /* setor técnico/financeiro */
    --liv-violet: 0.70 0.150 300;   /* admin/supervisor */
    --liv-orange: 0.74 0.150 55;    /* pós-venda */

    /* motion */
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --dur-fast: 120ms;
    --dur-base: 220ms;
    --dur-slow: 360ms;

    /* glows de acento (estado vencedor/foco) */
    --glow-gold: 0 0 0 1px oklch(var(--liv-gold) / 0.45), 0 6px 22px oklch(var(--liv-gold) / 0.16);
    --glow-sage: 0 0 0 1px oklch(var(--liv-sage) / 0.55), 0 6px 22px oklch(var(--liv-sage) / 0.20);
```

- [ ] **Step 4: Expor as cores no `tailwind.config.ts`**

No objeto `colors.liv`, adicionar (após `danger`):
```ts
          info: "oklch(var(--liv-info) / <alpha-value>)",
          teal: "oklch(var(--liv-teal) / <alpha-value>)",
          violet: "oklch(var(--liv-violet) / <alpha-value>)",
          orange: "oklch(var(--liv-orange) / <alpha-value>)",
```

- [ ] **Step 5: Adicionar keyframes de confete + pulse + shimmer em `globals.css`**

No bloco `@layer utilities`, adicionar:
```css
  @keyframes liv-confetti-fall {
    0% { opacity: 1; transform: translateY(-10vh) rotate(0deg); }
    100% { opacity: 0; transform: translateY(110vh) rotate(540deg); }
  }
  @keyframes liv-pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(1.5); }
  }
  @keyframes liv-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .liv-skeleton {
    background: linear-gradient(90deg, oklch(var(--liv-surface)) 25%, oklch(var(--liv-surface-2)) 37%, oklch(var(--liv-surface)) 63%);
    background-size: 200% 100%;
    animation: liv-shimmer 1.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .liv-skeleton { animation: none; }
  }
```

- [ ] **Step 6: Rodar teste e build**

Run: `npm test -- src/app/globals.tokens.test.ts && npx tsc --noEmit`
Expected: PASS + typecheck sem erro.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/app/globals.tokens.test.ts
git commit -m "feat(tokens): status tones, glows, motion e keyframes de confete/shimmer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Primitiva `CountUp`

**Files:**
- Create: `src/components/ui/count-up.tsx`
- Create: `src/components/ui/count-up.test.tsx`

**Interfaces:**
- Produces: `CountUp({ value, durationMs?, prefix?, suffix?, decimals?, className? })` — client component. Renderiza o valor final imediatamente (fallback seguro) e anima 0→value quando motion permitido.

- [ ] **Step 1: Teste — `src/components/ui/count-up.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountUp } from "./count-up";

describe("CountUp", () => {
  it("renderiza o valor final formatado em pt-BR com prefixo", () => {
    render(<CountUp value={120000} prefix="R$ " />);
    expect(screen.getByText("R$ 120.000")).toBeInTheDocument();
  });
  it("respeita decimais e sufixo", () => {
    render(<CountUp value={1.85} decimals={2} suffix="x" />);
    expect(screen.getByText("1,85x")).toBeInTheDocument();
  });
});
```

> Nota: jsdom não roda `requestAnimationFrame` real de forma útil; o componente renderiza o valor final no estado inicial, então o teste passa sem mockar rAF.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/count-up.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `src/components/ui/count-up.tsx`**

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

const prefersReduce = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, durationMs = 900, prefix = "", suffix = "", decimals = 0, className }: CountUpProps) {
  const [n, setN] = React.useState(value); // valor final primeiro (fallback seguro)

  React.useEffect(() => {
    if (prefersReduce()) { setN(value); return; }
    let raf = 0;
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      setN(value * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else setN(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const fmt = n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={cn("tabular-nums", className)}>{prefix}{fmt}{suffix}</span>;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/count-up.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/count-up.tsx src/components/ui/count-up.test.tsx
git commit -m "feat(ui): primitiva CountUp

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Primitiva `Avatar`

**Files:**
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/avatar.test.tsx`

**Interfaces:**
- Consumes: `getInitials` (Task 1).
- Produces: `Avatar({ name, rank?, size?, tone?, className? })`. `tone`: `"neutral" | "gold" | "sage"`. `rank===1`→ícone coroa; `rank` 2-3 → medalha; senão iniciais.

- [ ] **Step 1: Teste — `src/components/ui/avatar.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("mostra iniciais quando não há rank", () => {
    render(<Avatar name="Marina Andrade" />);
    expect(screen.getByText("MA")).toBeInTheDocument();
  });
  it("expõe label acessível com o nome", () => {
    render(<Avatar name="Rafael Costa" rank={1} />);
    expect(screen.getByLabelText("Rafael Costa")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/avatar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/avatar.tsx`**

```tsx
import * as React from "react";
import { Crown, Medal } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

type AvatarTone = "neutral" | "gold" | "sage";

interface AvatarProps {
  name: string;
  rank?: number;
  size?: number;
  tone?: AvatarTone;
  className?: string;
}

const toneClasses: Record<AvatarTone, string> = {
  neutral: "bg-liv-surface-2 text-liv-muted ring-1 ring-liv-line",
  gold: "bg-liv-gold/12 text-liv-gold ring-1 ring-liv-gold/30",
  sage: "bg-liv-sage/14 text-liv-sage ring-1 ring-liv-sage/30",
};

export function Avatar({ name, rank, size = 42, tone = "neutral", className }: AvatarProps) {
  const iconSize = Math.round(size * 0.42);
  const content =
    rank === 1 ? <Crown style={{ width: iconSize, height: iconSize }} /> :
    rank === 2 || rank === 3 ? <Medal style={{ width: iconSize, height: iconSize }} /> :
    <span className="font-bold" style={{ fontSize: Math.round(size * 0.36) }}>{getInitials(name)}</span>;

  return (
    <div
      role="img"
      aria-label={name}
      className={cn("grid shrink-0 place-items-center rounded-full", toneClasses[tone], className)}
      style={{ width: size, height: size }}
    >
      {content}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/avatar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/avatar.tsx src/components/ui/avatar.test.tsx
git commit -m "feat(ui): primitiva Avatar com rank e tones

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Primitiva `ProgressBar`

**Files:**
- Create: `src/components/ui/progress-bar.tsx`
- Create: `src/components/ui/progress-bar.test.tsx`

**Interfaces:**
- Produces: `ProgressBar({ value, max?, tone?, height?, showLabel?, className? })`. `tone`: `"sage" | "amber" | "gold"`. Clampa 0..100%. `role="progressbar"` com `aria-valuenow`.

- [ ] **Step 1: Teste — `src/components/ui/progress-bar.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("expõe aria-valuenow clampado em 100", () => {
    render(<ProgressBar value={150} max={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
  it("mostra label percentual quando showLabel", () => {
    render(<ProgressBar value={60} max={120} showLabel />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/progress-bar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/progress-bar.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressTone = "sage" | "amber" | "gold";

interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

const fillClasses: Record<ProgressTone, string> = {
  sage: "bg-liv-sage",
  amber: "bg-liv-gold/80",
  gold: "bg-liv-gold",
};

export function ProgressBar({ value, max = 100, tone = "sage", height = 8, showLabel, className }: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-liv-faint">Meta</span>
          <span className="font-bold tabular-nums text-liv-muted">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="overflow-hidden rounded-full bg-liv-surface-2"
        style={{ height }}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fillClasses[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/progress-bar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/progress-bar.tsx src/components/ui/progress-bar.test.tsx
git commit -m "feat(ui): primitiva ProgressBar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Primitiva `StatCard`

**Files:**
- Create: `src/components/ui/stat-card.tsx`
- Create: `src/components/ui/stat-card.test.tsx`

**Interfaces:**
- Produces: `StatCard({ label, value, tone?, highlight?, meta?, chart?, className? })`. `value` e `chart` são `ReactNode`. `tone`: `"default" | "accent" | "positive" | "negative"`. `highlight` realça borda coral.

- [ ] **Step 1: Teste — `src/components/ui/stat-card.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renderiza label, valor e meta", () => {
    render(<StatCard label="Faturamento" value="R$ 325.000" meta="Meta 20–25%" />);
    expect(screen.getByText("Faturamento")).toBeInTheDocument();
    expect(screen.getByText("R$ 325.000")).toBeInTheDocument();
    expect(screen.getByText("Meta 20–25%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/stat-card.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/stat-card.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "accent" | "positive" | "negative";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
  highlight?: boolean;
  meta?: React.ReactNode;
  chart?: React.ReactNode;
  className?: string;
}

const valueTone: Record<StatTone, string> = {
  default: "text-liv-ink",
  accent: "text-liv-sage",
  positive: "text-liv-sage",
  negative: "text-liv-danger",
};

export function StatCard({ label, value, tone = "default", highlight, meta, chart, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-liv-surface p-5",
        highlight ? "border-liv-danger/30" : "border-liv-line",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">{label}</p>
        {chart}
      </div>
      <p className={cn("mt-2 text-[1.75rem] font-bold leading-tight tracking-tight tabular-nums", valueTone[tone])}>
        {value}
      </p>
      {meta && <p className="mt-1 text-xs text-liv-faint">{meta}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/stat-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/stat-card.tsx src/components/ui/stat-card.test.tsx
git commit -m "feat(ui): primitiva StatCard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Primitiva `SegmentedControl`

**Files:**
- Create: `src/components/ui/segmented-control.tsx`
- Create: `src/components/ui/segmented-control.test.tsx`

**Interfaces:**
- Produces: `SegmentedControl<T extends string>({ options, value, onChange, className })` onde `options: { value: T; label: string }[]`. Indicador deslizante; `role="tablist"`.

- [ ] **Step 1: Teste — `src/components/ui/segmented-control.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentedControl } from "./segmented-control";

describe("SegmentedControl", () => {
  it("dispara onChange ao clicar numa opção", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        value="semana"
        onChange={onChange}
        options={[{ value: "semana", label: "Semana" }, { value: "mes", label: "Mês" }]}
      />,
    );
    fireEvent.click(screen.getByText("Mês"));
    expect(onChange).toHaveBeenCalledWith("mes");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/segmented-control.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/segmented-control.tsx`**

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> { value: T; label: string }

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={cn("relative inline-flex rounded-full border border-liv-line bg-liv-surface-2 p-0.5", className)}>
      <span
        aria-hidden
        className="absolute inset-y-0.5 rounded-full bg-liv-sage transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            o.value === value ? "text-liv-bg" : "text-liv-muted hover:text-liv-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/segmented-control.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/segmented-control.tsx src/components/ui/segmented-control.test.tsx
git commit -m "feat(ui): primitiva SegmentedControl

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Primitiva `Sparkline`

**Files:**
- Create: `src/components/ui/sparkline.tsx`
- Create: `src/components/ui/sparkline.test.tsx`

**Interfaces:**
- Produces: `Sparkline({ data, width?, height?, color?, area?, strokeWidth? })`. Retorna `null` se `data.length < 2`. SVG line+area com ponta pulsante (`.liv-pulse-dot` via animação inline).

- [ ] **Step 1: Teste — `src/components/ui/sparkline.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("não renderiza com menos de 2 pontos", () => {
    const { container } = render(<Sparkline data={[1]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
  it("renderiza um path de linha com dados válidos", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5]} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/sparkline.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/sparkline.tsx`**

```tsx
import * as React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
  strokeWidth?: number;
}

let gidCounter = 0;

export function Sparkline({ data, width = 120, height = 30, color = "oklch(var(--liv-sage))", area = true, strokeWidth = 2 }: SparklineProps) {
  const gid = React.useMemo(() => `spk${++gidCounter}`, []);
  if (!data || data.length < 2) return null;

  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const xs = (i: number) => (i / (data.length - 1)) * (width - pad * 2) + pad;
  const ys = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const pts = data.map((v, i) => [xs(i), ys(v)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const areaD = `${line} L ${(width - pad).toFixed(1)} ${height - pad} L ${pad} ${height - pad} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={areaD} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} style={{ animation: "liv-pulse-dot 1.6s ease-in-out infinite" }} />
    </svg>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/sparkline.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/sparkline.tsx src/components/ui/sparkline.test.tsx
git commit -m "feat(ui): primitiva Sparkline

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Primitiva `Reveal`

**Files:**
- Create: `src/components/ui/reveal.tsx`
- Create: `src/components/ui/reveal.test.tsx`

**Interfaces:**
- Produces: `Reveal({ delayMs?, children, className })` — entrada por estado + transição CSS. Sempre termina visível (`opacity:1`). Client component.

- [ ] **Step 1: Teste — `src/components/ui/reveal.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "./reveal";

describe("Reveal", () => {
  it("renderiza os filhos", () => {
    render(<Reveal><span>conteúdo</span></Reveal>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ui/reveal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/ui/reveal.tsx`**

```tsx
"use client";

import * as React from "react";

interface RevealProps {
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}

const EASE = "cubic-bezier(.22,1,.36,1)";

export function Reveal({ delayMs = 0, className, children }: RevealProps) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setOn(true), 20 + delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);
  return (
    <div
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : "translateY(10px)",
        transition: `opacity 340ms ${EASE}, transform 340ms ${EASE}`,
      }}
    >
      {children}
    </div>
  );
}
```

> `prefers-reduced-motion` é coberto pela regra global em `globals.css` que zera durações de transição; o estado final é sempre visível.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/ui/reveal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/reveal.tsx src/components/ui/reveal.test.tsx
git commit -m "feat(ui): primitiva Reveal (entrada por estado)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Estender `Button` (gold) e `Badge` (gold + status tones)

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Create: `src/components/ui/badge.test.tsx`

**Interfaces:**
- Produces: `Button` ganha `variant="gold"`; `Badge` ganha `variant` (ou `tone`) `gold | sage | info | teal | violet | orange | warning`.

- [ ] **Step 1: Ler o `badge.tsx` atual**

Run: `cat src/components/ui/badge.tsx`
Expected: ver as variants existentes pra estender sem quebrar.

- [ ] **Step 2: Teste — `src/components/ui/badge.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("aplica a variante gold", () => {
    render(<Badge variant="gold">Meta batida</Badge>);
    const el = screen.getByText("Meta batida");
    expect(el.className).toMatch(/liv-gold/);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/components/ui/badge.test.tsx`
Expected: FAIL — variante `gold` inexistente.

- [ ] **Step 4: Adicionar `variant: gold` ao `buttonVariants` em `button.tsx`**

No objeto `variants.variant`, adicionar:
```ts
        gold: "bg-liv-gold text-liv-bg hover:bg-liv-gold/90",
```

- [ ] **Step 5: Adicionar variants de status ao `badge.tsx`**

No `badgeVariants` (objeto `variants.variant`), adicionar as entradas:
```ts
        gold: "border-transparent bg-liv-gold/12 text-liv-gold",
        sage: "border-transparent bg-liv-sage/14 text-liv-sage",
        info: "border-transparent bg-liv-info/12 text-liv-info",
        teal: "border-transparent bg-liv-teal/12 text-liv-teal",
        violet: "border-transparent bg-liv-violet/12 text-liv-violet",
        orange: "border-transparent bg-liv-orange/12 text-liv-orange",
        warning: "border-transparent bg-liv-gold/12 text-liv-gold",
```

> Se o `badge.tsx` usar `tone` em vez de `variant`, adaptar os nomes — manter a chave que o arquivo já usa.

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- src/components/ui/badge.test.tsx && npx tsc --noEmit`
Expected: PASS + typecheck ok.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/badge.tsx src/components/ui/badge.test.tsx
git commit -m "feat(ui): variante gold no Button e tones de status no Badge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Estender `/api/dashboard/ranking` com meta, progresso e geradoEm

**Files:**
- Modify: `src/app/api/dashboard/ranking/route.ts`
- Modify: `src/lib/ranking.ts` (adicionar `buildDashboardRanking`)
- Modify: `src/lib/ranking.test.ts` (testar `buildDashboardRanking`)

**Interfaces:**
- Consumes: `rankByVendas` (Task 1), `prisma.configuracao.metaVendasMes`.
- Produces:
  - `buildDashboardRanking(vendedores, vendas, meta): { ranking: RankedVendedor[]; totais: { totalGeralVendido: number; totalGeralVendas: number } }`
  - Resposta JSON do route ganha, por vendedor: `meta`, `progresso`; e no topo: `geradoEm` (ISO string).

- [ ] **Step 1: Teste de `buildDashboardRanking` — append em `src/lib/ranking.test.ts`**

```ts
import { buildDashboardRanking } from "./ranking";

describe("buildDashboardRanking", () => {
  const vendedores = [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bia" }];
  const vendas = [
    { vendedorId: "a", valorVenda: 60000, margem: 1.8 },
    { vendedorId: "a", valorVenda: 60000, margem: 2.0 },
    { vendedorId: "b", valorVenda: 130000, margem: 1.5 },
  ];

  it("agrega vendas, ranqueia por quantidade e calcula meta/progresso", () => {
    const { ranking, totais } = buildDashboardRanking(vendedores, vendas, 120000);
    // Ana: 2 vendas / 120k; Bia: 1 venda / 130k → Ana lidera (mais vendas)
    expect(ranking[0].id).toBe("a");
    expect(ranking[0].qtdVendas).toBe(2);
    expect(ranking[0].progresso).toBeCloseTo(1); // 120k/120k
    expect(ranking[1].progresso).toBeCloseTo(130000 / 120000);
    expect(totais.totalGeralVendas).toBe(3);
    expect(totais.totalGeralVendido).toBe(250000);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/ranking.test.ts`
Expected: FAIL — `buildDashboardRanking` não existe.

- [ ] **Step 3: Implementar `buildDashboardRanking` em `src/lib/ranking.ts`**

Adicionar:
```ts
interface VendedorRef { id: string; nome: string }
interface VendaRef { vendedorId: string; valorVenda: number; margem: number }

export function buildDashboardRanking(vendedores: VendedorRef[], vendas: VendaRef[], meta: number) {
  const agregados: VendedorVendas[] = vendedores.map((v) => {
    const suas = vendas.filter((x) => x.vendedorId === v.id);
    const totalVendido = suas.reduce((s, x) => s + x.valorVenda, 0);
    const qtdVendas = suas.length;
    return {
      id: v.id,
      nome: v.nome,
      totalVendido,
      qtdVendas,
      ticketMedio: qtdVendas > 0 ? totalVendido / qtdVendas : 0,
      margemMedia: qtdVendas > 0 ? suas.reduce((s, x) => s + x.margem, 0) / qtdVendas : 0,
    };
  });

  const ranking = rankByVendas(agregados, meta);
  return {
    ranking,
    totais: {
      totalGeralVendido: ranking.reduce((s, r) => s + r.totalVendido, 0),
      totalGeralVendas: ranking.reduce((s, r) => s + r.qtdVendas, 0),
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/ranking.test.ts`
Expected: PASS.

- [ ] **Step 5: Refatorar o route pra usar o helper + meta + geradoEm**

Em `src/app/api/dashboard/ranking/route.ts`, substituir o cálculo manual do `ranking`/`totais` pelo helper e buscar a meta. Imports no topo:
```ts
import { buildDashboardRanking } from "@/lib/ranking";
import { getNow } from "@/lib/dates";
```
Após buscar `vendedores` e `vendas`, e antes do `return`:
```ts
  const config = await prisma.configuracao.findFirst();
  const meta = config?.metaVendasMes ?? 120000;

  const { ranking, totais } = buildDashboardRanking(
    vendedores.map((v) => ({ id: v.id, nome: v.nome })),
    vendas.map((v) => ({ vendedorId: v.vendedorId, valorVenda: v.valorVenda, margem: v.margem })),
    meta,
  );
```
E o `return NextResponse.json({...})` passa a usar `ranking`/`totais` do helper e adicionar `geradoEm`:
```ts
  return NextResponse.json({
    inicio,
    fim,
    geradoEm: getNow().toISOString(),
    meta,
    ranking: ranking.map((r) => ({ posicao: r.posicao, ...r })),
    badges: { melhorMargem, maiorTicket },
    totais,
  });
```

> Manter o cálculo de `badges` (melhorMargem/maiorTicket) como está — ele opera sobre os agregados; se necessário, derivar de `ranking` (que já tem `margemMedia`/`ticketMedio`).

- [ ] **Step 6: Verificar typecheck e build**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/dashboard/ranking/route.ts src/lib/ranking.ts src/lib/ranking.test.ts
git commit -m "feat(api): ranking do dashboard com meta, progresso e geradoEm

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Hook `useLiveRanking` (polling + diff)

**Files:**
- Create: `src/components/dashboard/use-live-ranking.ts`
- Create: `src/components/dashboard/use-live-ranking.test.ts`

**Interfaces:**
- Consumes: `RankedVendedor`, `LiveEvent`, `diffRanking` (Task 1); endpoint `/api/dashboard/ranking`.
- Produces:
  - `interface RankingPayload { ranking: RankedVendedor[]; totais: { totalGeralVendido: number; totalGeralVendas: number }; meta: number; geradoEm: string }`
  - `useLiveRanking(opts: { inicio: string; fim: string; intervalMs?: number; alwaysOn?: boolean; fetcher?: (url: string) => Promise<RankingPayload> }): { ranking: RankedVendedor[]; totais: RankingPayload["totais"] | null; events: LiveEvent[]; loading: boolean; consume: () => void }`
  - `consume()` limpa a fila de `events` após o componente reagir.

- [ ] **Step 1: Teste — `src/components/dashboard/use-live-ranking.test.ts`**

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/dashboard/use-live-ranking.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/dashboard/use-live-ranking.ts`**

```ts
"use client";

import * as React from "react";
import { diffRanking, type RankedVendedor, type LiveEvent } from "@/lib/ranking";

export interface RankingPayload {
  ranking: RankedVendedor[];
  totais: { totalGeralVendido: number; totalGeralVendas: number };
  meta: number;
  geradoEm: string;
}

interface UseLiveRankingOpts {
  inicio: string;
  fim: string;
  intervalMs?: number;
  alwaysOn?: boolean; // telão: mantém polling mesmo com aba oculta
  fetcher?: (url: string) => Promise<RankingPayload>;
}

const defaultFetcher = async (url: string): Promise<RankingPayload> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ranking ${res.status}`);
  return res.json();
};

export function useLiveRanking({ inicio, fim, intervalMs = 25000, alwaysOn = false, fetcher = defaultFetcher }: UseLiveRankingOpts) {
  const [ranking, setRanking] = React.useState<RankedVendedor[]>([]);
  const [totais, setTotais] = React.useState<RankingPayload["totais"] | null>(null);
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const prevRef = React.useRef<RankedVendedor[]>([]);

  const url = `/api/dashboard/ranking?inicio=${inicio}&fim=${fim}`;

  const tick = React.useCallback(async () => {
    try {
      const data = await fetcher(url);
      const next = data.ranking;
      const novos = diffRanking(prevRef.current, next);
      if (novos.length) setEvents((q) => [...q, ...novos]);
      prevRef.current = next;
      setRanking(next);
      setTotais(data.totais);
    } catch {
      /* mantém último snapshot em caso de falha de rede */
    } finally {
      setLoading(false);
    }
  }, [url, fetcher]);

  // reset de baseline ao trocar de período
  React.useEffect(() => { prevRef.current = []; setLoading(true); }, [inicio, fim]);

  React.useEffect(() => {
    let active = true;
    const run = () => { if (active) tick(); };
    run();
    const id = setInterval(() => {
      if (alwaysOn || !document.hidden) run();
    }, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [tick, intervalMs, alwaysOn]);

  const consume = React.useCallback(() => setEvents([]), []);

  return { ranking, totais, events, loading, consume };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/dashboard/use-live-ranking.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/use-live-ranking.ts src/components/dashboard/use-live-ranking.test.ts
git commit -m "feat(ranking): hook useLiveRanking com polling e diff

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Componente `LiveRanking` + celebrações (pódio, toasts, banner, confete)

**Files:**
- Create: `src/components/dashboard/ranking/Confetti.tsx`
- Create: `src/components/dashboard/ranking/CelebrationBanner.tsx`
- Create: `src/components/dashboard/ranking/Toasts.tsx`
- Create: `src/components/dashboard/ranking/Podium.tsx`
- Create: `src/components/dashboard/ranking/RankingRow.tsx`
- Create: `src/components/dashboard/LiveRanking.tsx`
- Create: `src/components/dashboard/LiveRanking.test.tsx`

**Interfaces:**
- Consumes: `useLiveRanking`, primitivas (`Avatar`, `ProgressBar`, `CountUp`, `Button`, `Badge`), `formatCurrency`.
- Produces:
  - `Confetti({ burstKey })`, `CelebrationBanner({ event })` (event `LiveEvent | null`), `Toasts({ items })`, `Podium({ top3, big })`, `RankingRow({ v, big })`.
  - `LiveRanking({ inicio, fim, telao?, demo? })`.

- [ ] **Step 1: Implementar `Confetti.tsx`**

```tsx
"use client";

import * as React from "react";

const COLORS = ["oklch(var(--liv-sage))", "oklch(var(--liv-gold))", "oklch(var(--liv-sand))"];

export function Confetti({ burstKey }: { burstKey: number }) {
  const pieces = React.useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({
      left: (i * 37) % 100,
      dur: 1.1 + ((i * 13) % 12) / 10,
      delay: ((i * 7) % 30) / 100,
      col: COLORS[i % COLORS.length],
      rot: (i * 53) % 360,
      w: 6 + (i % 6),
      h: 9 + (i % 8),
    })),
    [burstKey],
  );
  if (!burstKey) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden" key={burstKey}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`, width: p.w, height: p.h, background: p.col,
            transform: `rotate(${p.rot}deg)`,
            animation: `liv-confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implementar `CelebrationBanner.tsx`**

```tsx
"use client";

import * as React from "react";
import { Trophy, TrendingUp } from "lucide-react";
import type { LiveEvent } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export function CelebrationBanner({ event }: { event: LiveEvent | null }) {
  if (!event || event.kind === "sale") return null;
  const lead = event.kind === "lead";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold",
        lead ? "border-liv-sage/40 bg-liv-sage/12 text-liv-sage" : "border-liv-gold/40 bg-liv-gold/12 text-liv-gold",
      )}
    >
      {lead ? <Trophy className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
      <span>{lead ? `${event.nome} assumiu o 1º lugar!` : `${event.nome} bateu a meta!`}</span>
      <span className="ml-1 text-xs font-medium opacity-80">{lead ? "Novo líder do ranking" : "100% da meta do mês"}</span>
    </div>
  );
}
```

- [ ] **Step 3: Implementar `Toasts.tsx`**

```tsx
"use client";

import * as React from "react";
import { ShoppingCart, Trophy, TrendingUp } from "lucide-react";
import type { LiveEvent } from "@/lib/ranking";
import { formatCurrency } from "@/lib/utils";

export interface ToastItem extends LiveEvent { id: number }

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {items.map((t) => {
        const Icon = t.kind === "lead" ? Trophy : t.kind === "meta" ? TrendingUp : ShoppingCart;
        const msg = t.kind === "lead" ? " é o novo líder!" : t.kind === "meta" ? " bateu a meta!" : ` registrou ${formatCurrency(t.delta)}`;
        return (
          <div key={t.id} className="liv-rise flex items-center gap-2 rounded-xl border border-liv-line bg-liv-surface px-4 py-2.5 text-sm text-liv-ink shadow-lg">
            <Icon className="h-4 w-4 text-liv-sage" />
            <span><b>{t.nome}</b>{msg}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Implementar `Podium.tsx`**

```tsx
"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CountUp } from "@/components/ui/count-up";
import type { RankedVendedor } from "@/lib/ranking";
import { cn } from "@/lib/utils";

function PodiumCard({ p, big }: { p: RankedVendedor; big?: boolean }) {
  const first = p.posicao === 1;
  const done = p.progresso >= 1;
  return (
    <div className={cn(
      "flex flex-col items-center gap-2 rounded-2xl border bg-liv-surface p-5 text-center",
      first ? "border-liv-gold/30 shadow-[var(--glow-gold)]" : "border-liv-line",
      first && "sm:scale-105",
    )}>
      <Avatar name={p.nome} rank={p.posicao} tone={first ? "gold" : "neutral"} size={first ? (big ? 84 : 60) : (big ? 68 : 50)} />
      <div className={cn("font-bold text-liv-ink", big ? "text-lg" : "text-base")}>{p.nome}</div>
      <div className={cn("font-bold tabular-nums", done ? "text-liv-gold" : "text-liv-sage", big ? "text-2xl" : "text-xl")}>
        <CountUp value={p.totalVendido} prefix="R$ " durationMs={700} />
      </div>
      {done && <Badge variant="gold">Meta batida</Badge>}
      <div className="w-full">
        <ProgressBar value={p.progresso * 100} max={100} tone={done ? "gold" : "amber"} height={big ? 10 : 7} showLabel />
      </div>
    </div>
  );
}

export function Podium({ top3, big }: { top3: RankedVendedor[]; big?: boolean }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {order.map((p) => <PodiumCard key={p.id} p={p} big={big} />)}
    </div>
  );
}
```

- [ ] **Step 5: Implementar `RankingRow.tsx`**

```tsx
"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CountUp } from "@/components/ui/count-up";
import type { RankedVendedor } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export function RankingRow({ v, big }: { v: RankedVendedor; big?: boolean }) {
  const done = v.progresso >= 1;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-liv-line bg-liv-surface px-4 py-3.5">
      <span className="w-6 text-center text-sm font-bold tabular-nums text-liv-faint">{v.posicao}</span>
      <Avatar name={v.nome} rank={v.posicao} size={big ? 46 : 38} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-bold text-liv-ink", big ? "text-lg" : "text-base")}>{v.nome}</span>
          {done && <Badge variant="gold">Meta</Badge>}
        </div>
        <div className="mt-0.5 text-xs text-liv-faint">{v.qtdVendas} vendas</div>
      </div>
      <div className={cn(big ? "w-56" : "w-36", "shrink-0")}>
        <ProgressBar value={v.progresso * 100} max={100} tone={done ? "gold" : "amber"} height={big ? 9 : 6} />
      </div>
      <div className={cn("shrink-0 text-right font-bold tabular-nums", done ? "text-liv-gold" : "text-liv-sage", big ? "text-xl" : "text-lg")}>
        <CountUp value={v.totalVendido} prefix="R$ " durationMs={700} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implementar `LiveRanking.tsx`**

```tsx
"use client";

import * as React from "react";
import { ShoppingCart, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveRanking } from "./use-live-ranking";
import { Podium } from "./ranking/Podium";
import { RankingRow } from "./ranking/RankingRow";
import { Confetti } from "./ranking/Confetti";
import { CelebrationBanner } from "./ranking/CelebrationBanner";
import { Toasts, type ToastItem } from "./ranking/Toasts";
import type { LiveEvent } from "@/lib/ranking";

interface LiveRankingProps {
  inicio: string;
  fim: string;
  telao?: boolean;
  demo?: boolean;
  onOpenTelao?: () => void;
}

let toastSeq = 0;

export function LiveRanking({ inicio, fim, telao, demo, onOpenTelao }: LiveRankingProps) {
  const { ranking, events, loading, consume } = useLiveRanking({ inicio, fim, alwaysOn: telao });
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [banner, setBanner] = React.useState<LiveEvent | null>(null);
  const [burst, setBurst] = React.useState(0);

  // reage à fila de eventos do hook
  React.useEffect(() => {
    if (!events.length) return;
    const novos: ToastItem[] = events.map((e) => ({ ...e, id: ++toastSeq }));
    setToasts((q) => [...q.slice(-2), ...novos]);
    const celebra = events.find((e) => e.kind === "lead") ?? events.find((e) => e.kind === "meta");
    if (celebra) { setBanner(celebra); setBurst((b) => b + 1); }
    consume();
  }, [events, consume]);

  // auto-dismiss de toasts e banner
  React.useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((q) => q.slice(1)), 3600);
    return () => clearTimeout(id);
  }, [toasts]);
  React.useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(id);
  }, [banner]);
  React.useEffect(() => {
    if (!burst) return;
    const id = setTimeout(() => setBurst(0), 2000);
    return () => clearTimeout(id);
  }, [burst]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-4">
      <CelebrationBanner event={banner} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-liv-sage opacity-75" style={{ animation: "liv-pulse-dot 1.6s ease-in-out infinite" }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-liv-sage" />
          </span>
          <h2 className={telao ? "text-3xl font-bold text-liv-ink" : "text-lg font-bold text-liv-ink"}>Ranking ao vivo</h2>
        </div>
        {!telao && onOpenTelao && (
          <Button variant="secondary" size="sm" onClick={onOpenTelao}>
            <Layers className="mr-1.5 h-4 w-4" /> Modo telão
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className="liv-skeleton h-20 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {top3.length > 0 && <Podium top3={top3} big={telao} />}
          {rest.length > 0 && <div className="space-y-2.5">{rest.map((v) => <RankingRow key={v.id} v={v} big={telao} />)}</div>}
        </>
      )}

      <Toasts items={toasts} />
      <Confetti burstKey={burst} />

      {demo && <DemoTrigger />}
    </div>
  );
}

function DemoTrigger() {
  // Placeholder de demo: gatilho visual só-dev (ver Task 16, que injeta a lógica).
  return null;
}
```

- [ ] **Step 7: Teste de smoke — `src/components/dashboard/LiveRanking.test.tsx`**

```tsx
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
```

- [ ] **Step 8: Rodar testes + typecheck**

Run: `npm test -- src/components/dashboard/LiveRanking.test.tsx && npx tsc --noEmit`
Expected: PASS + sem erros de tipo.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/LiveRanking.tsx src/components/dashboard/LiveRanking.test.tsx src/components/dashboard/ranking/
git commit -m "feat(ranking): componente LiveRanking com podio, toasts, banner e confete

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Upgrade do Dashboard (KPIs + LiveRanking)

**Files:**
- Create: `src/components/dashboard/KpiCards.tsx`
- Create: `src/app/api/dashboard/resumo` — *já existe* (`route.ts`); apenas consumir.
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `/api/dashboard/resumo` (KPIs do período), `StatCard`, `CountUp`, `SegmentedControl`, `LiveRanking`, `getCurrentWeekRange`, `getCurrentMonthRange`.
- Produces: `KpiCards({ periodo })` que busca o resumo e renderiza 4 `StatCard` com `CountUp`.

- [ ] **Step 1: Inspecionar o payload de `/api/dashboard/resumo`**

Run: `sed -n '1,80p' src/app/api/dashboard/resumo/route.ts`
Expected: anotar os campos disponíveis (faturamento, vendas, ticket/comissões, margem) pra mapear nos 4 KPIs. Usar os campos reais que existirem; **não inventar**. Se faltar algum dos 4, usar o que houver e omitir Sparkline (sem série).

- [ ] **Step 2: Implementar `src/components/dashboard/KpiCards.tsx`**

```tsx
"use client";

import * as React from "react";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/ui/count-up";

interface Resumo {
  faturamento: number;
  vendas: number;
  ticketMedio: number;
  margemMedia: number;
}

export function KpiCards({ inicio, fim }: { inicio: string; fim: string }) {
  const [r, setR] = React.useState<Resumo | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/dashboard/resumo?inicio=${inicio}&fim=${fim}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data) setR(data); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [inicio, fim]);

  if (loading || !r) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="liv-skeleton h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Faturamento" tone="accent" value={<CountUp value={r.faturamento} prefix="R$ " />} />
      <StatCard label="Vendas" value={<CountUp value={r.vendas} />} />
      <StatCard label="Ticket médio" value={<CountUp value={r.ticketMedio} prefix="R$ " />} />
      <StatCard label="Margem média" value={<CountUp value={r.margemMedia} decimals={2} suffix="x" />} />
    </div>
  );
}
```

> Ajustar os nomes dos campos (`r.faturamento` etc.) conforme o payload real apurado no Step 1.

- [ ] **Step 3: Reescrever `src/app/dashboard/page.tsx`**

```tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { LiveRanking } from "@/components/dashboard/LiveRanking";
import { CampanhasSection } from "@/components/dashboard/CampanhasSection";
import { getCurrentWeekRange, getCurrentMonthRange } from "@/lib/dates";
import { useRouter } from "next/navigation";

type Periodo = "semana" | "mes";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [periodo, setPeriodo] = React.useState<Periodo>("semana");
  const range = periodo === "semana" ? getCurrentWeekRange() : getCurrentMonthRange();

  return (
    <div className="space-y-10">
      <div className="liv-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-liv-ink">
            Olá, {session?.user?.name?.split(" ")[0]}<span className="text-liv-sage">.</span>
          </h1>
          <p className="mt-1 text-sm text-liv-muted">Acompanhe as campanhas e o ranking do time</p>
        </div>
        <SegmentedControl
          value={periodo}
          onChange={setPeriodo}
          options={[{ value: "semana", label: "Semana" }, { value: "mes", label: "Mês" }]}
        />
      </div>

      <KpiCards inicio={range.start} fim={range.end} />

      <CampanhasSection userRole={(session?.user as { role?: string })?.role} />

      <LiveRanking
        inicio={range.start}
        fim={range.end}
        onOpenTelao={() => router.push("/dashboard/telao")}
      />
    </div>
  );
}
```

- [ ] **Step 4: Rodar a app e verificar visualmente**

Run: `npm run dev` e abrir `/dashboard` (login necessário).
Expected: 4 KPIs com CountUp, toggle Semana/Mês funcionando, Ranking ao vivo com pódio carregando dados reais, botão "Modo telão" navega.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/KpiCards.tsx src/app/dashboard/page.tsx
git commit -m "feat(dashboard): KPIs com CountUp + Ranking ao Vivo integrado

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Rota Modo Telão

**Files:**
- Create: `src/app/dashboard/telao/page.tsx`

**Interfaces:**
- Consumes: `LiveRanking` (modo `telao`), `getCurrentMonthRange`.

- [ ] **Step 1: Implementar `src/app/dashboard/telao/page.tsx`**

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveRanking } from "@/components/dashboard/LiveRanking";
import { getCurrentMonthRange } from "@/lib/dates";

export default function TelaoPage() {
  const router = useRouter();
  const range = getCurrentMonthRange();

  return (
    <div className="min-h-screen bg-liv-bg p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.16em] text-liv-faint">LIV Energia · Comissões</span>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
        <LiveRanking inicio={range.start} fim={range.end} telao />
      </div>
    </div>
  );
}
```

> A rota fica sob `/dashboard`, então herda o `layout.tsx` (auth) do grupo dashboard. Se o layout impuser sidebar/chrome indesejado no telão, mover pra rota top-level `src/app/telao/page.tsx` com seu próprio `layout.tsx` mínimo que só checa sessão. Decidir ao ver no Step 2.

- [ ] **Step 2: Verificar visualmente em tela cheia**

Run: `npm run dev` e abrir `/dashboard/telao` em fullscreen (F11).
Expected: pódio grande, polling ativo, sem chrome de nav atrapalhando. Ajustar a rota conforme a nota acima se necessário.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/telao/page.tsx
git commit -m "feat(ranking): rota Modo Telao para TV do escritorio

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Modo demo (`?demo=1`) — gatilho de celebração só-dev

**Files:**
- Modify: `src/components/dashboard/LiveRanking.tsx`
- Create: `src/components/dashboard/LiveRanking.demo.test.tsx`

**Interfaces:**
- Produces: quando `demo` é true, expõe botão "Simular venda" que injeta um `LiveEvent` sintético na fila local (toast/banner/confete), **sem** tocar a API. Ativado via `?demo=1` no dashboard.

- [ ] **Step 1: Teste — `src/components/dashboard/LiveRanking.demo.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/dashboard/LiveRanking.demo.test.tsx`
Expected: FAIL — não há botão "Simular venda".

- [ ] **Step 3: Substituir o `DemoTrigger` placeholder em `LiveRanking.tsx`**

No `LiveRanking`, adicionar um handler que injeta evento sintético e renderizar o botão quando `demo`. Adicionar, dentro do componente (antes do `return`):
```tsx
  function simular() {
    const alvo = ranking[Math.min(1, ranking.length - 1)] ?? { id: "demo", nome: "Demo", totalVendido: 0 };
    const ev: LiveEvent = { kind: "sale", id: alvo.id, nome: alvo.nome, delta: 12000 };
    setToasts((q) => [...q.slice(-2), { ...ev, id: ++toastSeq }]);
  }
```
E trocar `{demo && <DemoTrigger />}` por:
```tsx
      {demo && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={simular}>
            <ShoppingCart className="mr-1.5 h-4 w-4" /> Simular venda
          </Button>
        </div>
      )}
```
Remover a função `DemoTrigger` não usada. (Se `Button` não tiver `variant="primary"`, usar `variant="default"`.)

- [ ] **Step 4: Ligar o `?demo=1` no dashboard**

Em `src/app/dashboard/page.tsx`, ler o search param e passar pra `LiveRanking`:
```tsx
import { useSearchParams } from "next/navigation";
// ...
  const demo = useSearchParams().get("demo") === "1";
// ...
      <LiveRanking inicio={range.start} fim={range.end} demo={demo} onOpenTelao={() => router.push("/dashboard/telao")} />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/components/dashboard/LiveRanking.demo.test.tsx && npx tsc --noEmit`
Expected: PASS + typecheck ok.

- [ ] **Step 6: Rodar a suíte inteira**

Run: `npm test`
Expected: todos verdes.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/LiveRanking.tsx src/components/dashboard/LiveRanking.demo.test.tsx src/app/dashboard/page.tsx
git commit -m "feat(ranking): modo demo (?demo=1) para celebracoes em reuniao

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (executado pelo autor do plano)

**Spec coverage:**
- Tokens → Task 2 ✓ · Primitivas (Avatar/StatCard/ProgressBar/SegmentedControl/CountUp/Sparkline/Reveal) → Tasks 3-9 ✓ · Button/Badge estendidos → Task 10 ✓ · API meta/progresso/geradoEm → Task 11 ✓ · Engine de diff → Task 1 + hook Task 12 ✓ · LiveRanking (pódio/toasts/banner/confete) → Task 13 ✓ · Dashboard KPIs → Task 14 ✓ · Telão → Task 15 ✓ · Demo só-dev → Task 16 ✓ · Ranking por vendas → Task 1 ✓ · Sem dados fictícios em prod → Task 16 isola demo ✓.
- Sparkline (primitiva) entregue na Task 8, mas **não plugada** nos KPIs (sem série real) — coerente com o spec (item gated). KpiCards omite Sparkline de propósito.

**Placeholder scan:** `DemoTrigger` é placeholder intencional na Task 13 e é **removido/substituído** na Task 16 (declarado). Nenhum "TODO/TBD" pendente.

**Type consistency:** `RankedVendedor`, `LiveEvent`, `VendedorVendas` definidos na Task 1 e reusados em 11/12/13. `useLiveRanking` retorna `{ ranking, totais, events, loading, consume }` — consumido exatamente assim na Task 13. `Badge variant="gold"` definido na Task 10 e usado em 13. `progresso` é ratio (0..1+) em todo lugar; ProgressBar recebe `progresso*100`.

**Riscos conhecidos a confirmar na execução:**
- Campos reais de `/api/dashboard/resumo` (Task 14 Step 1 obriga inspeção antes de mapear).
- `badge.tsx` pode usar `tone` em vez de `variant` (Task 10 Step 1 obriga leitura antes).
- Layout do grupo `/dashboard` no telão (Task 15 Step 2 decide se move a rota).

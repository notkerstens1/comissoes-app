# Código Localizador + Data de Vistoria + Cor por Etapa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Adicionar código localizador (tag 4 dígitos) compartilhado entre cards de pós-venda e engenharia, campo data de vistoria exclusivo da engenharia, e cor por etapa nos cards de pós-venda.

**Architecture:** Campos aditivos no Prisma (`db push` no boot). Gerador de código único em lib própria com teste. Geração nos 3 pontos de criação de card. UI existente estendida (busca já existe; ETAPA_CORES já existe).

**Tech Stack:** Next.js 14 App Router, Prisma 5, TypeScript, Tailwind (tokens `liv-*` + `ETAPA_CORES`), Vitest.

## Global Constraints

- Schema 100% aditivo — nenhuma coluna existente alterada. Nada de `@unique` no código.
- Código = 4 dígitos string `"0000"`–`"9999"` (mantém zero à esquerda). Anti-colisão no gerador.
- `dataVistoria` editável só por `TECNICO`, `ADMIN`, `DIRETOR` (validado server-side). `POS_VENDA` vê read-only.
- Geração só em cards novos (sem backfill).
- Venda fechada gera **um** código e usa nos dois cards (SetorTecnico + PosVenda).
- Lógica de comissão/etapas intocada.

---

### Task 1: Schema + gerador de código único (com teste)

**Files:**
- Modify: `prisma/schema.prisma` (models `SetorTecnico`, `PosVenda`)
- Create: `src/lib/codigo-localizador.ts`
- Test: `src/lib/codigo-localizador.test.ts`

**Interfaces:**
- Produces: `gerarCodigo4(): string` · `gerarCodigoLocalizadorUnico(prisma: PrismaLike): Promise<string>`

- [ ] **Step 1: Schema — adicionar campos**

Em `model SetorTecnico`, após `email String?`:
```prisma
  codigoLocalizador String? // tag curta de 4 digitos, compartilhada com o card de pos-venda
```
E junto das datas-chave (após `dataRedeLigada String?`):
```prisma
  dataVistoria        String? // "YYYY-MM-DD" — vistoria da concessionaria (edicao exclusiva engenheiro)
```
Em `model PosVenda`, após `telefone String?`:
```prisma
  codigoLocalizador String? // tag curta de 4 digitos, compartilhada com o card de engenharia
```

- [ ] **Step 2: Escrever teste (falhando)**

`src/lib/codigo-localizador.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { gerarCodigo4, gerarCodigoLocalizadorUnico } from "./codigo-localizador";

describe("gerarCodigo4", () => {
  it("retorna sempre 4 caracteres numericos", () => {
    for (let i = 0; i < 200; i++) {
      const c = gerarCodigo4();
      expect(c).toMatch(/^\d{4}$/);
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
    const seq = ["0001", "0001", "0002"];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => Number(seq[i++]) / 10000);
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
```

- [ ] **Step 3: Rodar teste — deve falhar** (`npx vitest run src/lib/codigo-localizador.test.ts`) → FAIL (módulo não existe)

- [ ] **Step 4: Implementar**

`src/lib/codigo-localizador.ts`:
```ts
// Tag curta (4 digitos) que identifica um cliente e e compartilhada entre o
// card de pos-venda e o de engenharia. Gerada com checagem de colisao.

type PrismaLike = {
  setorTecnico: { findFirst: (args: { where: { codigoLocalizador: string } }) => Promise<{ id: string } | null> };
  posVenda: { findFirst: (args: { where: { codigoLocalizador: string } }) => Promise<{ id: string } | null> };
};

export function gerarCodigo4(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export async function gerarCodigoLocalizadorUnico(prisma: PrismaLike): Promise<string> {
  const MAX = 50;
  for (let tentativa = 0; tentativa < MAX; tentativa++) {
    const candidato = gerarCodigo4();
    const [emTec, emPos] = await Promise.all([
      prisma.setorTecnico.findFirst({ where: { codigoLocalizador: candidato } }),
      prisma.posVenda.findFirst({ where: { codigoLocalizador: candidato } }),
    ]);
    if (!emTec && !emPos) return candidato;
  }
  throw new Error("Nao foi possivel gerar codigo localizador unico (base saturada)");
}
```

- [ ] **Step 5: Rodar teste — deve passar.** Rodar `npx prisma generate`. Commit.

---

### Task 2: Gerar código nos 3 pontos de criação de card

**Files:**
- Modify: `src/app/api/vendas/route.ts` (bloco auto-create ~245-295)
- Modify: `src/app/api/setor-tecnico/route.ts` (POST ~82)
- Modify: `src/app/api/pos-venda/route.ts` (POST ~95)

**Interfaces:**
- Consumes: `gerarCodigoLocalizadorUnico(prisma)`

- [ ] **Step 1: vendas/route.ts — um código pros dois cards**

Adicionar import no topo: `import { gerarCodigoLocalizadorUnico } from "@/lib/codigo-localizador";`
Antes do `try` de "Auto-criar registro no Setor Tecnico", gerar uma vez:
```ts
    // Codigo localizador compartilhado entre os dois cards do mesmo cliente
    let codigoLocalizador: string | null = null;
    try { codigoLocalizador = await gerarCodigoLocalizadorUnico(prisma); } catch (e) { console.error("codigo localizador:", e); }
```
No `setorTecnico.create` data, adicionar `codigoLocalizador,`.
No `posVenda.create` data, adicionar `codigoLocalizador,`.

- [ ] **Step 2: setor-tecnico/route.ts POST**

Import `gerarCodigoLocalizadorUnico`. Antes do `create`:
```ts
  const codigoLocalizador = await gerarCodigoLocalizadorUnico(prisma);
```
No `data`, adicionar `codigoLocalizador,`.

- [ ] **Step 3: pos-venda/route.ts POST**

Import `gerarCodigoLocalizadorUnico`. Antes do `create`:
```ts
  const codigoLocalizador = await gerarCodigoLocalizadorUnico(prisma);
```
No `data`, adicionar `codigoLocalizador,`.

- [ ] **Step 4: `npx tsc --noEmit` → 0 erros. Commit.**

---

### Task 3: API leitura + gate de edição da data de vistoria

**Files:**
- Modify: `src/lib/roles.ts` (novo helper)
- Modify: `src/app/api/setor-tecnico/route.ts` (GET select)
- Modify: `src/app/api/pos-venda/route.ts` (GET select)
- Modify: `src/app/api/setor-tecnico/[id]/route.ts` (aceitar dataVistoria com gate)

- [ ] **Step 1: roles.ts — helper**

Após `canEditVenda`:
```ts
/**
 * Quem pode editar a data de vistoria (engenharia). Engenheiro (TECNICO) +
 * superusuarios (ADMIN/DIRETOR). POS_VENDA ve mas nao edita.
 */
export function canEditVistoria(role: string | undefined | null): boolean {
  return role === "TECNICO" || role === "ADMIN" || role === "DIRETOR";
}
```

- [ ] **Step 2: GETs — incluir campos nas listas**

Em `setor-tecnico/route.ts` GET `select`, adicionar `codigoLocalizador: true,` e `dataVistoria: true,`.
Em `pos-venda/route.ts` GET `select`, adicionar `codigoLocalizador: true,`.

- [ ] **Step 3: PUT [id] — aceitar dataVistoria só de quem pode**

Import: adicionar `canEditVistoria` ao import de `@/lib/roles`.
No destructuring do body (junto de `dataVisita, dataInstalacao, dataRedeLigada,`): adicionar `dataVistoria,`.
Após a linha `if (dataRedeLigada !== undefined) ...`:
```ts
  if (dataVistoria !== undefined && canEditVistoria(session.user.role)) {
    data.dataVistoria = dataVistoria?.trim() || null;
  }
```

- [ ] **Step 4: `npx tsc --noEmit` → 0 erros. Commit.**

---

### Task 4: UI Pós-Venda — código + copiar + busca estendida + cor por etapa

**Files:**
- Modify: `src/app/pos-venda/page.tsx`

- [ ] **Step 1: Interface + import cores**

Na interface do registro (perto de `etapa: string;`), adicionar `codigoLocalizador?: string;`.
Confirmar que `ETAPA_CORES` já está importado de `@/lib/pos-venda` (está — linha ~38).

- [ ] **Step 2: Estender busca (código + telefone)**

No filtro `buscaNorm` (~444), trocar o predicado de nome para:
```ts
    clientesFiltrados = clientesFiltrados.filter((r) =>
      (r.nomeCliente || "").toLowerCase().includes(buscaNorm) ||
      (r.codigoLocalizador || "").toLowerCase().includes(buscaNorm) ||
      (r.telefone || "").toLowerCase().includes(buscaNorm)
    );
```

- [ ] **Step 3: Cor por etapa — aba-filtro + selo + borda do card**

Onde o card renderiza o selo de etapa (usa `getEtapaLabel`), aplicar `ETAPA_CORES[r.etapa]`:
```tsx
{(() => { const c = ETAPA_CORES[r.etapa] ?? { bg: "bg-liv-surface-2", text: "text-liv-muted", border: "border-liv-line" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text} ${c.border} border`}>{getEtapaLabel(r.etapa as EtapaPosVenda)}</span>; })()}
```
No container do card, adicionar borda lateral colorida: `border-l-4` + `ETAPA_CORES[r.etapa].border` (fallback `border-liv-line`).
Nas abas-filtro de etapa (chips de `ETAPAS_POS_VENDA`), quando ativa/hover usar a cor da etapa (`ETAPA_CORES[e.key]`), mantendo o estado inativo neutro.

- [ ] **Step 4: Exibir código + botão copiar**

No cabeçalho do card, ao lado do nome:
```tsx
{r.codigoLocalizador && (
  <button onClick={() => navigator.clipboard.writeText(r.codigoLocalizador!)}
    title="Copiar codigo" className="text-xs font-mono px-1.5 py-0.5 rounded bg-liv-surface-2 text-liv-muted hover:text-liv-ink border border-liv-line">
    #{r.codigoLocalizador}
  </button>
)}
```

- [ ] **Step 5: `npx tsc --noEmit` → 0 erros. Commit.**

---

### Task 5: UI Engenharia — código + copiar + busca + data de vistoria

**Files:**
- Modify: `src/app/tecnico/page.tsx`

- [ ] **Step 1: Interface + estado**

Na interface do registro, adicionar `codigoLocalizador?: string;` e `dataVistoria?: string | null;`.

- [ ] **Step 2: Estender busca (código + telefone)**

No filtro `buscaNorm` (~462), trocar predicado para casar `nomeCliente`, `codigoLocalizador` e `telefone` (mesmo padrão da Task 4 Step 2).

- [ ] **Step 3: Exibir código + copiar** (mesmo componente da Task 4 Step 4, adaptado ao card da engenharia).

- [ ] **Step 4: Input de data de vistoria (gated)**

Calcular `const podeEditarVistoria = canEditVistoria(session?.user?.role);` (import `canEditVistoria` de `@/lib/roles`).
No card da instalação:
```tsx
<label className="text-xs text-liv-faint">Data de vistoria</label>
{podeEditarVistoria ? (
  <input type="date" value={r.dataVistoria ?? ""}
    onChange={(e) => handleSalvarDataVistoria(r, e.target.value)}
    className="bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-sm text-liv-ink" />
) : (
  <p className="text-sm text-liv-muted">{r.dataVistoria ? formatDate(r.dataVistoria) : "—"}</p>
)}
```
Handler (padrão dos PUT já existentes na página):
```ts
async function handleSalvarDataVistoria(r: RegistroTecnico, valor: string) {
  const res = await fetch(`/api/setor-tecnico/${r.id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataVistoria: valor || null }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); setErroMsg(e.error || "Erro ao salvar data de vistoria"); return; }
  await fetchRegistros(); await loadDetalhes(r.id);
}
```

- [ ] **Step 5: `npx tsc --noEmit` → 0 erros; `npm run build` → Compiled successfully. Commit.**

---

## Self-Review

- **Spec coverage:** código localizador (T1-T4/T5), gerador+teste (T1), geração 3 pontos (T2), leitura API (T3), gate vistoria (T3/T5), UI pós-venda cor+código+busca (T4), UI engenharia data+código+busca (T5). ✔
- **Placeholders:** nenhum. ✔
- **Type consistency:** `codigoLocalizador?: string`, `dataVistoria?: string | null`, `gerarCodigoLocalizadorUnico(prisma)`, `canEditVistoria(role)` — consistentes entre tasks. ✔

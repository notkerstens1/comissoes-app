# Design — Redesign Fase 0: Chrome compartilhado

**Data:** 2026-06-26
**Branch:** `feat/redesign-fase0-chrome` (a partir de `main` @ 20498f7)
**Programa:** redesign completo do comissoes-app no design system LIV, tela a tela, em ondas. Esta é a **Fase 0 (fundação)** — o chrome compartilhado que toda tela herda. As ondas A–E (telas por área) vêm depois, cada uma com seu próprio spec/plano.

## Objetivo

Tirar o "template antigo" (azul-marinho `#0b0f19` + verde-limão neon `lime-400` + 8 cores de seção neon + `text-gray-*` cravado) do chrome compartilhado e colocar tudo no design system LIV (tokens `liv-*`, primitivas, `.impeccable.md`). Isso melhora **todas** as telas de imediato e define a linguagem visual que as ondas seguintes replicam.

## Contexto: estado atual

- `src/components/Sidebar.tsx` — nav principal. Usa `bg-[#141820]`/`border-[#232a3b]`, logo `bg-lime-400` com ícone Sun, rótulos de seção em 8 tons neon (amber/purple/fuchsia/sky/orange/teal/emerald/lime), estado ativo por papel em neon, `text-gray-*`. Nav é agrupada por papel (vendedor/técnico/SDR/financeiro/revenue/performance/diretor/gestão/admin/supervisor) com role-gating via `@/lib/roles`.
- **14 layouts** (`src/app/*/layout.tsx`) quase idênticos: cada um é auth-guard (predicado de papel) + `<Sidebar/>` + `<main className="lg:ml-64 p-6 ...">` dentro de `<div className="min-h-screen bg-[#0b0f19]">`. Diferem só no predicado de papel e na cor neon do spinner de loading. 13/14 usam `bg-[#0b0f19]`.
- `src/app/layout.tsx` (root) — ok (fontes Satoshi via Fontshare, Providers). Não precisa redesign além de já carregar Satoshi.
- Design system já pronto (do dashboard): tokens `liv-*` em `globals.css`, primitivas `Badge`/`Button`/etc. em `src/components/ui/`, `.impeccable.md`.
- `/telao` (rota top-level) NÃO usa Sidebar — intencional, não tocar.

## Decisões de design

1. **Acento único = sage; calma sobre carnaval.** `.impeccable.md` princípio 1 (60/30/10, acento raro). Estado ativo de nav e foco em sage, consistente. Rótulos de seção neutros (`text-liv-faint`, estilo `liv-eyebrow`). O papel do usuário continua distinguível, mas via o `Badge` primitivo com tons contidos do design system — não fundo neon por seção.
2. **DRY dos 14 layouts** num `AppShell`. Cada layout vira casca fina passando seu predicado de papel. Preserva o role-gating 1:1 (sem afrouxar segurança).
3. **Sem rail/bottom-tabs agora** (YAGNI). Mantém o padrão atual: sidebar fixa `w-64` no desktop, drawer no mobile — só reskinnado. Largura `w-64` preservada pra não quebrar `lg:ml-64`.
4. **`PageHeader` primitivo** entregue agora como contrato pras ondas (mesmo topo em toda tela).
5. **Tokens são source of truth**; nada de hex cravado novo.

## Arquitetura

### 1. `src/components/Sidebar.tsx` (redesign)
- Superfícies: `bg-liv-sidebar` (mapear pra `liv-surface`/um token de sidebar), bordas `border-liv-line`.
- Marca: monograma LIV — quadrado arredondado `bg-liv-sage` com a marca em `liv-bg`/off-white (reaproveitar o SVG do handoff `app.jsx`, simples). Título "LIV Energia" (`text-liv-ink`) + "Comissões" (`text-liv-faint`).
- Bloco do usuário: nome `text-liv-ink`, email `text-liv-faint`, papel via `<Badge variant={tone}>` — mapa de papel→tom contido: diretor=`gold`, admin/supervisor=`violet`, sdr=`info`, posVenda=`orange`, tecnico=`teal`, financeiro=`sage`, vendedor=`sage`.
- Nav: mantém o agrupamento por papel e o role-gating existente. Rótulos de seção: `text-liv-faint` uppercase tracking (classe `liv-eyebrow`). Item: default `text-liv-muted hover:bg-liv-surface-2 hover:text-liv-ink`; **ativo** `bg-liv-sage/14 text-liv-sage` (consistente, substitui o ativo por-papel neon). Ícones lucide herdam a cor do item.
- Logout: `text-liv-danger hover:bg-liv-danger/10`.
- Responsivo: mantém toggle + overlay + drawer mobile, reskinnado. `aside` fixo `w-64` no `lg`.
- Preserva 100% da lógica de papéis/links existente (só muda a aparência).

### 2. `src/components/AppShell.tsx` (novo)
- `"use client"`. Props: `{ guard?: (role?: string) => boolean; children: React.ReactNode }`.
- Auth: `useSession`. `status === "loading"` → spinner centrado (`border-liv-line border-t-liv-sage`). `status === "unauthenticated"` → `router.push("/")`. Se `guard` definido e `guard(role)` falso (e autenticado) → `router.push("/dashboard")`. `if (!session) return null`.
- Render: `<div className="min-h-screen bg-liv-bg"><Sidebar /><main className="lg:ml-64 p-6 lg:p-8"><div className="mx-auto max-w-[1280px]">{children}</div></main></div>`.
- Substitui o corpo repetido dos 14 layouts.

### 3. Os 14 layouts → cascas finas
Cada `src/app/<area>/layout.tsx` vira:
```tsx
"use client";
import { AppShell } from "@/components/AppShell";
import { <guards> } from "@/lib/roles";
export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => <mesma condição de papel do layout atual>}>{children}</AppShell>;
}
```
O predicado replica exatamente a condição de acesso atual do layout (ex: `(r) => isSDR(r) || isAdmin(r)`). Layouts sem guard de papel (ex: dashboard, que só exige sessão) passam sem `guard`.

### 4. `src/components/ui/page-header.tsx` (novo)
- `{ eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode; className?: string }`.
- Render: eyebrow (`liv-eyebrow text-liv-faint`), `<h1>` título (`text-[1.75rem] font-bold tracking-tight text-liv-ink`), subtitle (`text-sm text-liv-muted`), `actions` à direita. Layout flex com wrap responsivo.

## Fora de escopo (Fase 0)
- Redesenhar o **conteúdo** das telas (isso são as ondas A–E).
- Rail/bottom-tabs no Sidebar.
- Tela de login (`/`) — entra na Onda E.
- Mexer em `/telao` (já no padrão, sem Sidebar).

## Testes
- `Sidebar`: render test — para um papel mockado, renderiza os links esperados e aplica classe ativa de sage no pathname corrente (`usePathname`/`useSession` mockados).
- `AppShell`: render test — loading mostra spinner; autenticado sem guard renderiza children; guard que reprova chama redirect (mock `useRouter`).
- `PageHeader`: render test — title/eyebrow/subtitle/actions renderizam.
- Visual: rodar `npm run dev`, conferir o shell logado em 2-3 papéis (vendedor, admin, diretor) e que as telas existentes ainda renderizam dentro do shell novo. `npm run build` deve passar.

## Critérios de sucesso
- Zero `#0b0f19`, `lime-*`, `text-gray-*`, `#141820`/`#232a3b` no chrome (Sidebar + 14 layouts + AppShell).
- Sidebar no padrão LIV: monograma sage, ativo sage consistente, papéis via Badge contido.
- Os 14 layouts compartilham o `AppShell`; cada role-guard preservado 1:1.
- `PageHeader` disponível pras ondas.
- `npm test` verde, `npm run build` sucesso, sem regressão de auth/role-gating.

## Riscos
- **Role-gating:** replicar cada predicado de layout exatamente. Conferir cada um dos 14 contra o original antes de trocar. Um guard afrouxado = vazamento de acesso num sistema vivo.
- **`lg:ml-64`:** manter largura do sidebar = `w-64` pra alinhar com o offset do main.
- **`bg-liv-sidebar`:** se não existir token dedicado, usar `liv-surface` (ou adicionar `--liv-sidebar` em globals.css — aditivo).

# Design — Redesign Onda A: Diretoria & Revenue

**Data:** 2026-06-26
**Branch:** `feat/redesign-onda-a-diretoria` (a partir de `main`)
**Programa:** redesign do comissoes-app no design system LIV, tela a tela. Fase 0 (chrome) já no ar. Esta é a **Onda A** — telas de Diretoria & Revenue, as mais visíveis pro Erick.

## Princípio de segurança (CONTRATO DE REDESIGN — vale pra toda tela/componente da onda)

> **Preservar 100% da lógica; mudar só a apresentação.** "Garantir que nada vai quebrar."

Em CADA arquivo redesenhado:
- **NÃO mudar:** data fetching (`fetch`/SWR/props), estado (`useState`/`useEffect`), cálculos, handlers, condicionais de negócio, chamadas de API, shapes de dados, nomes de campos, lógica de permissão. Os números e o comportamento têm que sair idênticos.
- **MUDAR só o JSX de apresentação:** trocar cores antigas (`text-gray-*`, `lime-*`, `#0b0f19`, `text-blue-*`, `emerald/sky/amber/...-400`) por tokens `liv-*`; adotar primitivas (`Card`, `StatCard`, `Badge`, `Button`, `ProgressBar`, `PageHeader`, `SegmentedControl`) onde mapeiam; melhorar hierarquia/espaçamento/layout pro nível do dashboard novo.
- **Gráficos (recharts):** manter os dados e a estrutura; só re-estilizar cores pra tokens liv (`oklch(var(--liv-sage))` etc.), grid/eixos em `liv-line`/`liv-faint`.
- **Gate por tela:** `npx tsc --noEmit` limpo + `npm run build` sucesso. Onde houver lógica pura extraível (ex: formatação), adicionar teste; senão, o gate é build + review confirmando que nenhuma linha de lógica mudou (diff de lógica = vazio).

## Telas da Onda A (ordem de execução: menor risco → maior)

| # | Tela | Linhas | Componentes próprios | Nota |
|---|---|---|---|---|
| 1 | `/diretor/backup` | 205 | — | utilitário isolado |
| 2 | `/diretor/limpeza` | 263 | — | utilitário isolado |
| 3 | `/diretor/previsoes` | 300 | — | **self-renderiza Sidebar (duplicata pré-existente)** → remover o Sidebar próprio e deixar o layout/AppShell cuidar |
| 4 | `/diretor/ranking` | 364 | — | ranking de gestão (distinto do dashboard) |
| 5 | `/diretor/custos` | 387 | — | custos por venda |
| 6 | `/financeiro` | 561 | — | painel financeiro |
| 7 | `/performance` | 591 | performance/* (11) | dashboard de performance |
| 8 | `/diretor` | 698 | — | painel financeiro principal (mais usado) |
| 9 | `/revenue` | 124 | revenue/* (15) + cro/* (5) | CRO dashboard (composição) |

Componentes (`revenue/*`, `performance/*`, `cro/*`) são redesenhados junto da tela que os compõe (telas 7 e 9), sob o mesmo contrato.

## Padrão visual (herda Fase 0 + dashboard)
- Todo topo de tela usa `<PageHeader eyebrow title subtitle actions>`.
- Cards → primitiva `Card`/`StatCard`; KPIs com `tabular-nums`, acento sage.
- Tabelas: header `bg-liv-surface-2 text-liv-faint`, linhas `divide-liv-line`, hover `bg-liv-surface-2`.
- Badges/estados via `Badge` (tons contidos). Botões via `Button`.
- Entrada com `liv-rise`/`Reveal` onde fizer sentido (sem exagero).
- `prefers-reduced-motion` já coberto globalmente.

## Fora de escopo
- Mudar qualquer lógica/dado/endpoint.
- Telas de outras ondas (B–E).
- `/telao`, chrome (já feito).

## Critérios de sucesso (por tela e da onda)
- Zero `text-gray-*`/`lime-*`/`#0b0f19`/neon-`-400` nas telas/componentes da onda.
- `tsc` limpo + `build` sucesso após cada tela.
- Review confirma **diff de lógica vazio** (só JSX/classes mudaram) em cada tela.
- `/diretor/previsoes` deixa de ter Sidebar duplicado.
- Nenhuma regressão de números/comportamento.

## Cadência
Executar tela a tela (implementer redesign sob contrato → reviewer confirma lógica intacta + visual + build). Merge da onda em `main` (deploy) quando o conjunto estiver verde — ou em sub-lotes pequenos se preferível, pra isolar risco.

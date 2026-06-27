# Design — Redesign Onda B: SDR & Pré-venda

**Data:** 2026-06-26
**Branch:** `feat/redesign-onda-b-sdr` (a partir de `main` @ 706af0a)
**Programa:** redesign do comissoes-app no design system LIV, tela a tela. Fase 0 (chrome) + Onda A (Diretoria & Revenue) já no ar. Esta é a **Onda B** — telas de SDR/pré-venda, usadas pela Samara no dia a dia.

## Princípio de segurança (CONTRATO DE REDESIGN — vale pra toda tela da onda)

> **Preservar 100% da lógica; mudar só a apresentação.** "Garantir que nada vai quebrar."

Em CADA arquivo redesenhado:
- **NÃO mudar:** data fetching (`fetch`/endpoints/payloads/query params), estado (`useState`/`useEffect`), cálculos, handlers (incl. `confirm()` destrutivo), condicionais de negócio, shapes de dados, nomes de campos, lógica de permissão, listas de constantes (`MOTIVOS_*`, status). Os números e o comportamento têm que sair idênticos.
- **MUDAR só o JSX de apresentação:** trocar cores antigas (`text-gray-*`, `lime-*`, `#0b0f19`, `#141820`, `#232a3b`, `bg-[#...]`, `emerald/sky/blue/amber-400` neon) por tokens `liv-*`; adotar primitivas (`PageHeader`, `Card`, `StatCard`, `Badge`, `Button`, `ProgressBar`, `SegmentedControl`, `Avatar`) onde mapeiam; melhorar hierarquia/espaçamento/layout pro nível do dashboard novo. `tabular-nums` em números.
- **Modais:** manter a lógica de abrir/fechar/salvar; reskinnar o painel (superfície `bg-liv-surface`, borda `liv-line`, overlay, inputs no padrão LIV). Não mudar os campos nem o payload do PUT/POST.
- **Gate por tela:** `npx tsc --noEmit` limpo + `npm run build` sucesso. Sem teste por tela (é JSX puro); o gate é build + review confirmando **diff de lógica vazio**.

## Telas da Onda B (ordem de execução: menor risco → maior)

| # | Tela | Linhas | Nota |
|---|---|---|---|
| 1 | `/admin/sdr/forecast` | 149 | projeção de comissão SDR (admin) |
| 2 | `/admin/sdr/pendencias` | 163 | pendências de registros |
| 3 | `/sdr/extrato` | 211 | extrato de comissão da SDR |
| 4 | `/admin/sdr/pagamento` | 271 | marcação de pagamento (admin) — atenção a handlers de write |
| 5 | `/sdr` | 463 | dashboard da SDR (KPIs + tabela + modal de edição + ligações do dia) |
| 6 | `/admin/sdr` | 631 | gestão SDR (admin) |
| 7 | `/sdr/registros` | 1121 | registro de reuniões — a maior e mais complexa (form + tabela + modais) |

Não há componentes dedicados em `src/components/sdr/` — toda a lógica é inline nas páginas. Cada página é redesenhada por inteiro sob o contrato.

## Padrão visual (herda Fase 0 + Onda A)
- Topo de tela com `<PageHeader eyebrow title subtitle actions>`. NÃO re-adicionar `<main>`/`<Sidebar>`/`min-h-screen`/`p-6` — o `AppShell` (layout) já provê chrome+padding; a página retorna só o conteúdo (`<div className="space-y-6">`).
- KPIs → `StatCard`; números `tabular-nums`, acento sage.
- Tabelas: header `bg-liv-surface-2 text-liv-faint`, linhas `divide-liv-line`, hover `bg-liv-surface-2`.
- Badges de status via `Badge` (tons contidos). Botões via `Button`.
- **Semântica de cor:** negativo/pendente/não-compareceu = `liv-danger`/amber; positivo/compareceu/pago = `liv-sage`; meta/destaque = `liv-gold`. NUNCA verde pra coisa ruim.
- `prefers-reduced-motion` já coberto globalmente.

## Fora de escopo
- Mudar qualquer lógica/dado/endpoint/handler.
- Telas de outras ondas (C–E). `EditVendaPanel` (compartilhado) fica pra Onda C.
- Chrome (Sidebar/AppShell — já feito).

## Critérios de sucesso
- Zero `text-gray-*`/`lime-*`/`#0b0f19`/`#141820`/`#232a3b`/neon-`-400` nas 7 telas.
- `tsc` limpo + `build` sucesso após cada tela.
- Review confirma **diff de lógica vazio** (só JSX/classes mudaram) em cada tela.
- Nenhuma regressão de números/comportamento; modais salvam igual.

## Cadência
Tela a tela (implementer redesign sob contrato → reviewer confirma lógica intacta + visual + build). Merge da onda em `main` (deploy) em sub-lotes pequenos pra isolar risco — sugestão: lote 1 (telas 1–4, admin+extrato), lote 2 (telas 5–6, dashboards), lote 3 (tela 7, registros). Conferir que `prisma/schema.prisma` não mudou antes de cada deploy.

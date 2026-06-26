# Design — LIV Design System + Ranking ao Vivo

**Data:** 2026-06-25
**Branch:** `feat/ranking-ao-vivo-telao` (a partir de `feat/ui-repaginada-dashboard`)
**Origem:** handoff de design `~/Downloads/design_handoff_liv` (protótipos hi-fi React/CDN)

## Objetivo

Reconstruir o design system LIV do handoff dentro do `comissoes-app` de produção
(Next.js 14 App Router + TypeScript + Tailwind + Prisma + next-auth), recriando os
protótipos no nosso stack — **não** copiando o bundle de protótipo. A peça nova de
maior valor é o **Ranking ao Vivo** com **Modo Telão** pra TV do escritório, ligado a
dados reais via polling.

## Contexto: o que já existe

- `globals.css` já tem um design system LIV dark (tokens OKLCH `liv-*`: bg, surface,
  surface-2, line, ink, muted, faint, sage, sage-deep, sand, gold, danger) + `.liv-rise`.
- `components/ui/`: button, badge, card, input, label, select, slide-panel, table, tabs
  (estilo shadcn/CVA com `class-variance-authority`, `clsx`, `tailwind-merge`).
- Dashboard atual: greeting + `CampanhasSection` + `RankingSection` (estático).
- `/api/dashboard/ranking`: ranking **por quantidade de vendas** (faturamento desempata),
  com badges (melhorMargem, maiorTicket) e totais. **Não** retorna meta por vendedor.
- `/api/diretor/ranking`: já calcula `metaVendasMes`, `progressoMeta`, `metaTime`.
- `lib/utils`: `formatCurrency`, `formatNumber`. `lib/dates`: `getCurrentWeekRange`,
  `getCurrentMonthRange`. `lib/roles`: `ROLES_VENDEDOR_TIME`.
- `.impeccable.md` define a direção: dark premium sage/areia/grafite, Satoshi, sóbrio,
  **o número que rankeia é o herói = quantidade de vendas**.

## Decisões (ajustes sobre o protótipo)

1. **Ranking ordena por quantidade de vendas**, não faturamento. O protótipo ordena por
   `vendido`; mantemos a regra de produção (`.impeccable.md` princípio 2). Faturamento
   desempata.
2. **Dados reais via polling.** O protótipo fabrica vendas com `fire()`. Em produção o
   ranking faz polling de `/api/dashboard/ranking` e dispara celebrações quando as
   mudanças acontecem de verdade. Nada de `META=120000` hardcoded — meta vem da config.
3. **Sem Tweaks panel** (densidade/card/motion). O próprio README manda trocar por
   config/feature-flags. Bake do visual final: Confortável / Elevado / motion Completo,
   respeitando `prefers-reduced-motion`.
4. **`/diretor/ranking` (edição/gestão) fica intacto.**
5. **Tokens:** OKLCH `liv-*` continua source of truth; adicionamos só o que falta.
6. **Sparkline alimentado só com trend real.** A API não devolve série histórica hoje;
   não inventamos série. V1 do KPI = valor + CountUp + meta; Sparkline (primitiva) fica
   pronta e é ligada quando houver endpoint de trend (item gated).

## Arquitetura

### Camada 1 — Tokens (`src/app/globals.css` + `tailwind.config.ts`)

Adicionar como CSS vars + cores Tailwind `liv-*` (canais OKLCH, padrão `<alpha-value>`):

- Status tones que faltam: `info`, `teal`, `violet`, `orange` (+ `warning`, `positive`,
  `danger` já existem como sage/gold/danger — mapear nomes). Cada um com variante soft
  via utilitário de opacidade do Tailwind (`bg-liv-info/12`).
- Glows de acento: `--glow-gold`, `--glow-sage` (usados em estado vencedor/foco).
- Motion: `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-emphasized`, durações
  `--dur-fast/base/slow`, `--hover-lift`, `--press-scale`.

Satoshi continua via Fontshare (self-host é tarefa futura, fora deste PR).

### Camada 2 — Primitivas (`src/components/ui/`)

Estilo CVA, dark, tipadas. **Construir:**

- `Avatar` — `name`→iniciais; `rank` mostra coroa (1º) / medalha (2-3); `tone`
  gold/neutral/sage; `size`.
- `StatCard` — `label`, `value` (ReactNode, aceita CountUp), `tone`, `highlight`
  (borda/realce coral), `meta` (label secundário), slot `chart`.
- `ProgressBar` — `value`/`max`, `tone` lime/amber/gold, `height`, `showLabel`.
- `SegmentedControl` — indicador deslizante; generaliza o toggle Semana/Mês.
- `CountUp` — client component; rAF easeOutCubic; renderiza valor final primeiro
  (fallback seguro); respeita `prefers-reduced-motion`; formatação pt-BR.
- `Sparkline` — SVG line+area com ponta pulsante; só renderiza com `data.length >= 2`.
- `Reveal` — entrada por estado + transição CSS (lição #1 do handoff: nunca usar
  `animation … both` com keyframe que começa oculto; sempre termina visível).

**Estender:** `Button` (+variant `gold`, estado loading se ainda não tiver),
`Badge` (+tone `gold` e status tones).

### Camada 3 — API (`src/app/api/dashboard/ranking/route.ts`)

Estender o retorno (sem migração de banco): por vendedor, incluir `meta` (alvo de vendas
do mês, reusando a lógica de `diretor/ranking`/config) e `progressoMeta` (0–1+). Adicionar
`geradoEm` (timestamp ISO) no payload. O diff de "cruzou a meta" depende disso.

### Camada 4 — Ranking ao Vivo (`src/components/dashboard/LiveRanking.tsx` + hook)

- `useLiveRanking(periodo)` — hook client: fetch inicial + polling (~25s). Guarda
  snapshot anterior em `useRef`. A cada novo snapshot, faz diff por vendedor e emite
  eventos:
  - `qtdVendas` aumentou → evento `sale` (toast).
  - progresso cruzou 100% (antes <1, agora ≥1) → evento `meta` (banner ouro + confete).
  - rank passou a ser 1 (antes ≠1) → evento `lead` (banner sage + confete).
  - Pausa polling quando `document.hidden` (exceto modo telão). Limpa intervalos no
    unmount.
- `LiveRanking` — consome o hook. Renderiza:
  - **Pódio top-3** (1º centralizado e maior, glow ouro, Avatar dourado, valor CountUp,
    `ProgressBar` de meta — verde ≥100% / âmbar abaixo, badge "Meta batida" ≥100%).
  - **Lista 4+** com mini-barra de meta.
  - **Toasts** (auto-dismiss ~3.6s), **CelebrationBanner** (auto-dismiss ~3s),
    **Confetti** (~46 peças nas cores da marca, via keyframe, respeitando reduced-motion).
  - Prop `telao` muda escala (fontes grandes) e mantém polling mesmo com aba oculta.
- **Demo só-dev:** atrás de `?demo=1`, expõe "Simular venda" + "Auto" que mutam o estado
  local (não a API) pra mostrar celebrações em reunião/treinamento. Escondido por padrão.

Componentes auxiliares: `Podium`/`PodiumCard`, `RankingRow`, `Toasts`,
`CelebrationBanner`, `Confetti` (podem viver em `components/dashboard/ranking/`).

### Camada 5 — Dashboard (`src/app/dashboard/page.tsx`)

greeting → `SegmentedControl` Semana/Mês → grid de 4 `StatCard` (CountUp; Margem do mês
com `highlight`) → `LiveRanking` → card de meta do time (`ProgressBar`). Skeleton shimmer
(~600ms) ao entrar e ao trocar período. `CampanhasSection` permanece.

### Camada 6 — Modo Telão (`src/app/dashboard/telao/page.tsx`)

Rota dedicada, tela cheia, sem chrome de nav, fontes grandes, polling real ligado, período
default = Mês. Botão "Modo telão" no dashboard navega pra cá. Bookmarkável pra abrir na TV.

## Fora de escopo (YAGNI)

Tweaks panel; self-host de Satoshi; bundle `_ds_bundle.js`; qualquer tela além de
tokens/primitivas/dashboard/ranking/telão. Sparkline com série real fica gated até existir
endpoint de trend.

## Critérios de sucesso

- Dashboard mostra 4 KPIs com CountUp e o Ranking ao Vivo com pódio.
- Numa nova venda real (refletida na API), um toast aparece em até ~25s; bater meta ou
  virar 1º dispara banner + confete.
- Modo Telão abre em tela cheia e atualiza sozinho.
- Tudo respeita `prefers-reduced-motion` (estados finais visíveis, sem animação travada).
- Ranking ordenado por quantidade de vendas. Sem dados fictícios em produção.
- Nenhuma regressão em `/diretor/ranking` nem na invariante `comissaoTotal`.

## Riscos / pontos a confirmar na implementação

- **Unidade da meta:** ranking é por vendas, então `progressoMeta` deve ser
  `qtdVendas / metaVendas`. Confirmar de onde sai a meta individual (config global vs.
  por vendedor) reusando a lógica de `diretor/ranking`. Se só houver meta de time, derivar
  individual = metaTime / nº vendedores.
- **Custo do polling:** 25s com diff client-side é barato; pausar em aba oculta evita
  carga desnecessária. Telão fica sempre ativo (é o caso de uso).

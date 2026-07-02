# Código Localizador + Data de Vistoria + Cor por Etapa (Pós-Venda) — Design

**Data:** 2026-06-30
**Contexto:** comissoes-app (LIV). Ajustes na área de Engenharia (SetorTecnico) e Pós-Venda (PosVenda).

## Objetivo

Três mudanças no mesmo pacote, todas na operação pós-venda/engenharia:

1. **Código localizador** — identificador curto e aleatório por cliente, compartilhado entre o card de pós-venda e o de engenharia, pra achar o cliente no futuro (ex.: cliente de um ano atrás volta a reclamar).
2. **Data de vistoria** — campo novo exclusivo da engenharia, editável só pelo engenheiro (+ diretor/admin).
3. **Cor por etapa no pós-venda** — devolver diferenciação visual das etapas (perdida na migração pro DS LIV).

## Estado atual relevante

- Venda fechada **auto-cria os dois cards** (`SetorTecnico` + `PosVenda`) ligados pelo mesmo `vendaId` (`src/app/api/vendas/route.ts:249` e `:284`).
- Pós-venda (POS_VENDA) e engenharia (TECNICO) também criam cards manuais avulsos via POST próprio.
- `dataVisita`/`dataInstalacao`/`dataRedeLigada` já existem no schema e na API; **vistoria é conceito distinto** (inspeção da concessionária) e não tem campo.
- `ETAPA_CORES` (13 cores distintas por etapa) existe em `src/lib/pos-venda.ts:38` mas deixou de ser usado nas abas/cards após o redesign Onda D.
- Ambas as telas já têm busca por nome (`buscaNome`) — `src/app/pos-venda/page.tsx:124`, `src/app/tecnico/page.tsx:172`.

## Decisões (validadas com o Erick)

| Tema | Decisão |
|---|---|
| Formato da tag | **4 dígitos** (`"0000"`–`"9999"`, mantém zero à esquerda) |
| Backfill | **Não** — só cards novos a partir de agora |
| Busca | Estender filtro existente: casar **código + nome + telefone** |
| Data de vistoria | Campo novo **só na engenharia**; edição por **TECNICO + ADMIN/DIRETOR**; POS_VENDA vê read-only |
| Cor por etapa | Reativar `ETAPA_CORES` em: aba-filtro + selo de etapa + **borda lateral colorida no card** |

## Arquitetura

### Schema (aditivo — aplica via `db push` no boot do Railway, sem perda de dado)
- `SetorTecnico`: `codigoLocalizador String?` · `dataVistoria String?` (`"YYYY-MM-DD"`)
- `PosVenda`: `codigoLocalizador String?`

> Não há `@unique` no código: dois cards do MESMO cliente (mesma venda) compartilham o código de propósito. A unicidade é garantida no gerador.

### Gerador — `src/lib/codigo-localizador.ts` (novo)
- `gerarCodigo4(): string` — número aleatório 0–9999, `padStart(4,"0")`. (Runtime do app; `Math.random` ok aqui.)
- `gerarCodigoLocalizadorUnico(prisma): Promise<string>` — gera candidato, checa se já existe em `SetorTecnico` **ou** `PosVenda`; regera em colisão; teto de ~50 tentativas; se estourar (base perto de 10k), lança erro explícito (não cria card com código duplicado).

### Onde gerar (só novos)
- `vendas/route.ts` (auto-create): gerar **um** código antes do bloco e usar **o mesmo** nos dois `create` (unifica pós-venda↔engenharia).
- `pos-venda/route.ts` POST: gerar código próprio.
- `setor-tecnico/route.ts` POST: gerar código próprio.

### API — leitura e edição
- GET `setor-tecnico` e `pos-venda` (listas): incluir `codigoLocalizador` no `select`; em setor-tecnico incluir `dataVistoria`.
- PUT `setor-tecnico/[id]`: aceitar `dataVistoria`, **mas só aplicar** se `role ∈ {TECNICO, ADMIN, DIRETOR}` (helper novo `canEditVistoria(role)` em `src/lib/roles.ts`). POS_VENDA enviando o campo → ignora (não erro).

### UI
- **`/pos-venda/page.tsx`:**
  - Exibir `codigoLocalizador` em destaque no card + botão **copiar**.
  - Estender `buscaNome` → casar também código e telefone.
  - Reativar `ETAPA_CORES`: aba-filtro de etapa + selo de etapa do card + **borda lateral** (`border-l-4`) na cor da etapa.
- **`/tecnico/page.tsx`:**
  - Exibir `codigoLocalizador` + botão copiar.
  - Estender `buscaNome` → casar também código e telefone.
  - Input editável de **data de vistoria** no card (visível pra todos com acesso; editável só pra TECNICO/ADMIN/DIRETOR, read-only pros demais).
- Interfaces TS das duas páginas: adicionar `codigoLocalizador?: string` (e `dataVistoria?: string` no tecnico).

## Contrato de segurança
- Mudanças de schema 100% aditivas; nenhuma coluna existente alterada.
- Lógica de comissão/etapas intocada.
- Permissão de vistoria validada server-side (não confiar só na UI).

## Testes
- Unit (`src/lib/codigo-localizador.test.ts`): `gerarCodigo4` sempre 4 chars numéricos com zero à esquerda; `gerarCodigoLocalizadorUnico` regenera em colisão (prisma mockado) e respeita o teto.

## Fora de escopo
- Backfill de cards antigos.
- Integração automática com o sistema de monitoramento externo (a tag é manual: copiada pro contato/monitoramento).
- Expor os outros campos de data (visita/instalação/rede ligada) na UI.

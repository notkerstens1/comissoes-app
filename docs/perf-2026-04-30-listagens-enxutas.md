# Otimização de performance — listagens pos-venda e setor técnico

**Data:** 30/abr/2026
**Commit:** `8009dac`
**Deploy:** Railway auto-deploy a partir de `main`

## Sintoma

`/pos-venda` e `/tecnico` carregando lentos em produção. Erick reportou degradação perceptível na navegação.

## Causa

As duas listagens compartilhavam o mesmo padrão pesado:

1. **API retornava todos os registros sem paginação** (`prisma.findMany` com `where: { ativo: true }` e nada mais).
2. **Cada registro carregava campos JSON gigantes** que crescem com o tempo: `historicoAcoes`, `anotacoes`, `anexos` (base64 às vezes), `tarefas`, `comentarios`. Esses campos são strings JSON e podem chegar a centenas de KB por registro.
3. **Página 100% client-side** com 30+ `useState` e ~1.300 linhas. Tudo é renderizado de uma vez quando o array chega.
4. **Sem índices** no Prisma para `ativo`, `etapa`, `proximoContato`, `createdAt`.
5. **Sem cache** no client — toda navegação refazia o fetch completo.

O custo dominante era **rede + parse de JSON no client**, não a query no banco.

## Solução

### 1. API enxuta nas listagens

`GET /api/pos-venda` e `GET /api/setor-tecnico` agora usam `select` explícito:

- **Mantidos:** campos leves de listagem (`nomeCliente`, `etapa`, datas, relação com `venda` e `operador`).
- **Convertidos em count:** `anexos`, `tarefas`, `comentarios` viram `anexosCount`, `tarefasCount`, `comentariosCount` — um número, calculado server-side com `safeArrayLen()`.
- **Removidos da listagem:** `historicoAcoes`, `anotacoes`. Só voltam quando o card é expandido.
- **`take: 500`** como limite defensivo — evita explosão de payload se a tabela crescer muito.

### 2. Endpoints `[id]` com GET

Criados dois novos handlers:

- `GET /api/pos-venda/[id]` em [src/app/api/pos-venda/[id]/route.ts](../src/app/api/pos-venda/[id]/route.ts)
- `GET /api/setor-tecnico/[id]` em [src/app/api/setor-tecnico/[id]/route.ts](../src/app/api/setor-tecnico/[id]/route.ts)

Retornam o registro completo, incluindo todos os campos pesados.

### 3. Frontend com fetch on-demand

Em [src/app/pos-venda/page.tsx](../src/app/pos-venda/page.tsx) e [src/app/tecnico/page.tsx](../src/app/tecnico/page.tsx):

- Tipo do registro ganhou `_detalhesCarregados?: boolean` e marcou os campos pesados como `?` (opcionais).
- `loadDetalhes(id)` faz fetch do `[id]` GET e faz merge no state.
- `toggleExpand(id)` substitui o `setExpandedId` direto. Quando o usuário expande pela primeira vez, dispara o fetch. Refetch é evitado pela flag `_detalhesCarregados`.
- Counts no card colapsado usam `r.anexosCount ?? ...` — server-provided com fallback pro parse local quando os detalhes já estão na memória.

### 4. Índices Prisma

Em [prisma/schema.prisma](../prisma/schema.prisma):

```prisma
model PosVenda {
  // ...
  @@index([ativo, etapa])
  @@index([proximoContato])
}

model SetorTecnico {
  // ...
  @@index([ativo, etapa])
  @@index([createdAt])
}
```

Aplicados em produção via `prisma db push --accept-data-loss` que roda no `npm start` da Railway ([package.json:8](../package.json#L8)).

## Validação

Build local: ✅ `npx next build` passou sem erros.

Probe da API live (sem autenticação) após deploy:

```
GET /api/pos-venda          → 401   (handler ativo)
GET /api/pos-venda/[id]     → 401   (handler novo ativo — antes era 405)
GET /api/setor-tecnico      → 401
GET /api/setor-tecnico/[id] → 401   (antes era 405)
```

A mudança de **405 → 401** nos `[id]` confirma que o código novo está em produção.

## Próximos níveis (não aplicados)

Se a velocidade ainda não estiver no nível desejado depois deste round:

- **Cache no client** com SWR ou TanStack Query — evita refetch na navegação entre páginas do app.
- **Virtualização** (`react-virtual`) se as listas passarem de ~200 cards visíveis simultaneamente.
- **Server Component + streaming** pro shell inicial — elimina o spinner e renderiza o frame da página antes do JS hidratar.
- **Prefetch on hover** — disparar o fetch do `[id]` quando o cursor passar em cima do card, não só no clique. Esconde o delay da primeira expansão.
- **Compressão de campos JSON** (gzip ou estrutura mais enxuta) se algum registro específico ficar grande demais.

## Notas

- O sistema vivo da LIV é **este repo (`comissoes-app`)**, não o Fluxo em `/Users/ERICK/Desktop/CLAUDE/fluxo/`. O `CLAUDE.md` da pasta LIV em `RapportOS/osfiles/clientes/liv/` ainda diz o contrário e precisa ser corrigido em outra sessão.
- Railway faz auto-deploy a partir de `main`. Push pra `main` = produção em ~3min.
- Tabelas continuam sem `LIMIT` real no DB — o `take: 500` é só na query do app. Se precisar de paginação real (filtros, busca, scroll infinito), o frontend precisa ser refeito.

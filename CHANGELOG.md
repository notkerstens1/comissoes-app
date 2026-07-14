# Histórico de alterações — comissoes-app

Registro das mudanças relevantes do sistema. Entrada mais recente no topo.
Cada item aponta o "porquê" além do "o quê". Detalhe técnico completo fica no git.

## 2026-07-13

### Pós-venda — Endereço da geradora sem digitar duas vezes
- O endereço da geradora era digitado **duas vezes**: uma no fluxo do pós-venda e
  outra no card de Engenharia (Setor Técnico). Eram dois lugares para a mesma info.
- Agora o card de pós-venda tem um campo **Endereço da geradora** que lê e grava o
  **mesmo** `SetorTecnico.enderecoInstalacao` (fonte de verdade única), ligado pelo
  `vendaId` (fallback `codigoLocalizador`). Preenche num, aparece no outro.
- Ao salvar pelo pós-venda, o endereço é **geocodificado** (Nominatim) igual ao lado
  do técnico — o pin no Mapa de Usinas continua consistente. Sem coluna nova no banco
  e sem migração (os endereços já viviam no card técnico).
- Edge case: ~40% dos cards de pós-venda são legados **sem card de engenharia
  vinculado** (sem `vendaId`/`codigoLocalizador`). Nesses, salvar endereço **retorna
  erro na tela (409)** em vez de gravar em silêncio — o usuário sabe que não colou.
  Cards do fluxo normal (venda fechada gera os dois cards) salvam normalmente.

### Setor técnico — Custo de material CA por faixa de inversor
- A referência de custo de material CA na **Margem de Instalação** deixou de ser
  um R$500 fixo pra todo card e passou a ser **por faixa de potência do inversor**:
  **≤ 7 kW → R$550** · **> 7 kW → R$700** (sem faixa marcada cai no padrão R$500).
- Pedro classifica a faixa manualmente no card (lê do PDF do pedido) — dois botões
  ao lado do custo. O **custo real** lançado continua intocado; muda só o estimado
  que a Margem usa pra calcular o delta.
- Valores 550/700 editáveis em `/admin/configuracoes`. Resolvidos ao vivo pela config.
- Fora de escopo: o lucro-por-venda do diretor (`custos.ts`) segue em R$500 fixo.

### Setor técnico — Performance da lista (navegação lenta)
- O GET da lista puxava `anexos` e `comentarios` (PDFs/imagens em base64, **~110 MB**
  somados em prod) do Postgres só pra contar quantos eram — e a lista recarrega a
  cada ação. Era a causa da lentidão da engenharia.
- Agora os counts vêm de `json_array_length` no próprio Postgres (só o inteiro cruza
  a rede). Payload por load: **~110 MB → ~50 KB**. Counts idênticos ao método antigo
  (validado em prod, 0 divergências).

### Setor técnico — Instalador + Mapa de Usinas ao vivo
- Novo campo **Instalador** no card (Pedro registra quem executou a instalação em campo).
- Ao salvar o endereço da geradora, o sistema **geocodifica** (Nominatim) e guarda
  latitude/longitude. Novo endpoint token-gated `/api/mapa-usinas` devolve as usinas
  instaladas com coordenadas para o Mapa de Usinas (LIV) consumir ao vivo, no lugar
  da extração manual dos anexos.

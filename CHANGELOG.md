# Histórico de alterações — comissoes-app

Registro das mudanças relevantes do sistema. Entrada mais recente no topo.
Cada item aponta o "porquê" além do "o quê". Detalhe técnico completo fica no git.

## 2026-07-13

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

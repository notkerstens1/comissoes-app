# LIV Energia - Sistema de Gestao de Comissoes

## Sobre o Projeto
Sistema de gestao completo para a empresa de energia solar **LIV Energia**, focado em comissoes de vendas, gerenciamento de leads SDR, pos-venda e analise financeira P&L.

## Tech Stack
- **Frontend**: Next.js 14.2 + React 18 + TypeScript + Tailwind CSS (tema dark)
- **Backend**: Next.js API Routes + NextAuth.js (Credentials)
- **Database**: PostgreSQL + Prisma 5.22
- **Deploy**: Railway
- **Timezone**: America/Fortaleza

## Roles do Sistema (7)
| Role | Descricao | Rota Padrao |
|------|-----------|-------------|
| VENDEDOR | Vendedor interno | /vendedor/oportunidades |
| VENDEDOR_EXTERNO | Vendedor terceirizado | /vendedor/oportunidades |
| ADMIN | Supervisor da equipe | /admin |
| DIRETOR | Diretoria (P&L completo) | /diretor |
| SDR | Sales Development Rep | /sdr |
| POS_VENDA | Operador pos-venda | /pos-venda |
| FINANCEIRO | Financeiro (pagamentos) | /financeiro |

## Modulos Principais
- **Vendas**: criacao, comissoes progressivas (3 faixas: 35%/45%/50% sobre over)
- **SDR**: registro de leads, ligacoes diarias, vinculacao automatica com vendas
- **Oportunidades**: pipeline do vendedor com forecast, probabilidade, estagios
- **Financeiro**: visao de vendas por mes, marcar como pago, ver orcamento PDF
- **Diretor**: P&L completo, custos por venda, ranking, excecoes de margem
- **Admin**: gerenciar vendedores, faixas de comissao, configuracoes, SDR
- **Pos-Venda**: pipeline de 6 etapas (Tramites -> Concluida)
- **Calculadora**: simulador de comissao para vendedores
- **Campanhas**: metas de equipe e individuais
- **Performance**: metricas diarias de trafego e comercial
- **Revenue Analytics (CRO)**: dashboard 360 com 4 abas (rota /revenue)

## Revenue Analytics — Dashboard CRO (/revenue)
Dashboard estilo Chief Revenue Officer que integra 5 fontes de dados externas.

### Fontes de Dados (sync automatico)
| Fonte | API Route | Lib | Modelo Prisma |
|-------|-----------|-----|---------------|
| Meta Ads | `/api/sync/meta-ads` | `src/lib/meta-api.ts` | MetaAdsCampaign |
| Gronner CRM | `/api/sync/gronner` | `src/lib/gronner-client.ts` + `src/lib/lead-scoring.ts` | GronnerLead |
| Nibo (financeiro) | `/api/sync/nibo` | `src/lib/nibo-client.ts` | NiboRecord |
| Instagram | `/api/sync/instagram` | `src/lib/instagram-api.ts` | InstagramDaily, InstagramPost |
| YouTube | `/api/sync/youtube` | `src/lib/youtube-api.ts` | YouTubeDaily, YouTubeVideo |

### 4 Abas do Dashboard
1. **Visao Geral**: KPIs (CPL, CAC, ROI), funil, trend spend x leads x sales, performance time, campanhas
2. **Marketing**: metricas Instagram + YouTube, correlacao conteudo x leads, top posts/videos
3. **Pos-Venda**: pipeline, clientes atrasados, taxa conclusao (usa modelo PosVenda existente)
4. **Financeiro**: receita x despesas, lucro, CAC vs ticket (somente DIRETOR)

### Controle de Acesso Revenue
| Role | Aba 1 | Aba 2 | Aba 3 | Aba 4 |
|------|-------|-------|-------|-------|
| DIRETOR | Tudo | Tudo | Tudo | Tudo |
| ADMIN | Sem custos | Tudo | Tudo | Bloqueado |
| VENDEDOR | Suas metricas | Leitura | Seus clientes | Bloqueado |
| SDR | Suas metricas | Leitura | Bloqueado | Bloqueado |

### Envs Necessarias (Revenue Analytics)
- META_ACCESS_TOKEN, LIV_META_AD_ACCOUNT_ID
- GRONNER_URL, GRONNER_EMAIL, GRONNER_PASS
- NIBO_API_KEY
- INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID
- YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID

## Logica de Comissao
- Margem minima: 1.8x (valorVenda / custoEquipamentos)
- Abaixo de 1.8x = SEM comissao sobre over
- Comissao base: 2.5% do valor da venda
- Over = valorVenda - (custoEquipamentos * fatorMultiplicador)
- Faixas progressivas: acumula volume mensal do vendedor

## Fluxo de Informacao (SDR -> Vendedor -> Financeiro/Diretor)
1. **SDR** registra lead com: nome cliente, data reuniao, consideracoes, documento (imagem), compareceu/nao
2. **Vendedor** ve todas as infos do SDR na aba Oportunidades (botao olho expande detalhes)
3. **Vendedor** fecha venda com dados + upload de PDF do orcamento
4. **Financeiro** ve a venda com PDF do orcamento + info SDR (botao olho expande)
5. **Diretor** ve P&L + PDF do orcamento + info SDR na tabela expandivel
6. **Admin/Supervisor** ve tudo nas oportunidades (filtro por vendedor)

## Banco de Dados (23 modelos)
User, Venda, SolicitacaoMargem, Configuracao, DailyTraffic, DailyCommercial, FaixaComissao, RegistroSDR, LigacoesSDR, MetricasSDROverride, PendenciaVinculo, PosVenda, SetorTecnico, SimulacaoVenda, Notificacao, Campanha, MetaAdsCampaign, GronnerLead, NiboRecord, InstagramDaily, InstagramPost, YouTubeDaily, YouTubeVideo

## Campos Importantes (Venda)
- orcamentoUrl: String? (base64 PDF, uploaded pelo vendedor ao fechar venda)
- custos operacionais: custoInstalacao, custoVisitaTecnica, custoCosern, custoTrtCrea, custoEngenheiro, custoMaterialCA, custoImposto
- lucroLiquido, margemLucroLiquido (calculados automaticamente)

## Campos SDR Visiveis ao Vendedor
- consideracoes (texto livre da SDR)
- imagemUrl (documento anexado - conta de luz, etc)
- motivoNaoCompareceu (se nao compareceu)
- compareceu (boolean)
- nomeCliente, dataReuniao, sdr.nome

## Design System
- Tema dark: bg-[#0b0f19], cards bg-[#1a1f2e], borders border-[#232a3b]
- Accent primario: lime-400 (#a3e635)
- Botoes: bg-lime-400 text-gray-900
- Inputs: bg-[#141820] border-[#232a3b]
- Icons: lucide-react
- Responsive mobile-first

## Ambiente
- .env: DATABASE_URL (PostgreSQL Railway), NEXTAUTH_SECRET, NEXTAUTH_URL
- Prisma generate para client, db push para schema sync
- npm run dev (porta 3000)

## Ultima Atualizacao (03/03/2026)
- Implementado fluxo completo de informacao SDR -> Vendedor -> Financeiro -> Diretor
- Upload de PDF do orcamento no modal "Fechar Venda" do vendedor
- Botao "Ver Info SDR" (olho) expandivel na tabela de oportunidades do vendedor
- PDF do orcamento visivel e baixavel no Financeiro e Diretor
- Info SDR (consideracoes, documento, compareceu) visivel no Financeiro e Diretor
- API vendas POST agora salva orcamentoUrl
- APIs financeiro e diretor retornam registrosSDR e orcamentoUrl
- **Notas do Supervisor**: campo `notaAdmin` no RegistroSDR, visivel somente para ADMIN/DIRETOR
  - Editavel inline na secao expandida (botao olho) das oportunidades
  - Card com fundo amber diferenciado para notas privadas
  - Indicador visual (bolinha amber) no botao olho quando tem nota
  - API GET filtra `notaAdmin` para vendedores (nao veem o campo)
  - API PUT aceita `notaAdmin` somente de admin/diretor

## Ultima Atualizacao (29/03/2026)
- Revenue Analytics (CRO): dashboard 360 com 4 abas
- 5 syncs automatizados: Meta Ads, Gronner CRM, Nibo, Instagram, YouTube
- 8 novos modelos Prisma para dados externos
- Lead scoring ICP portado de liv-automation (regex, sem Ollama)
- Campo syncSource adicionado ao DailyTraffic
- Menu "Revenue Analytics" adicionado a Sidebar (ADMIN/DIRETOR)
- Componentes: RevenueSummaryCards, FunnelVertical, SpendLeadsTrend, TeamPerformance, CampaignROI, SocialSummaryCards, SocialGrowthTrend, TopPostsGrid, PosVendaKPIs, PosVendaPipeline, FinancialKPIs, FinancialTrend, AlertBanner, SyncButton, RevenueDateFilter

## Notas para o Proximo Chat
- `prisma db push` precisa ser rodado no ambiente com DATABASE_URL valida (Railway) para criar as novas tabelas
- Envs de APIs externas (Meta, Gronner, Nibo, Instagram, YouTube) precisam ser configuradas no Railway
- O sync do Nibo requer plano Premium com API habilitada
- Instagram usa mesmo token do Meta Business (mesmo app)
- O arquivo comissoes-app esta em /Users/ERICK/PROJETOS/comissoes-app/

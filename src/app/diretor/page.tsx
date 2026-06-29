"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3,
  Wallet,
  DollarSign,
  Percent,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Bell,
  CheckCircle,
  XCircle,
  X,
  FileText,
  Eye,
  ChevronUp,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";
import { EditVendaPanel, VendaEditavel } from "@/components/EditVendaPanel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SolicitacaoMargem {
  id: string;
  vendaId: string;
  clienteNome: string;
  vendedorNome: string;
  margemAtual: number;
  custoEquipAtual: number;
  novaMargem: number;
  novoCustoEquipamentos: number;
  status: string;
  createdAt: string;
  solicitante: { nome: string };
  venda: { valorVenda: number; mesReferencia: string };
}

interface SDRInfoDiretor {
  id: string;
  nomeCliente: string;
  sdrNome: string;
  dataReuniao: string;
  compareceu: boolean;
  motivoNaoCompareceu: string | null;
  consideracoes: string | null;
  imagemUrl: string | null;
  statusLead: string;
}

interface VendaFinanceira {
  id: string;
  cliente: string;
  vendedor: string;
  valorVenda: number;
  custoEquipamentos: number;
  quantidadePlacas: number;
  quantidadeInversores: number;
  custoInstalacao: number;
  custoVisitaTecnica: number;
  custoCosern: number;
  custoTrtCrea: number;
  custoEngenheiro: number;
  custoMaterialCA: number;
  custoImposto: number;
  comissaoVendedor: number;
  lucroLiquido: number;
  margemLucroLiquido: number;
  margem: number;
  atipica?: boolean;
  status: string;
  dataConversao: string;
  orcamentoUrl: string | null;
  registrosSDR: SDRInfoDiretor[];
}

interface DadosFinanceiros {
  mes: string;
  resumo: {
    faturamentoTotal: number;
    custoEquipamentosTotal: number;
    custoInstalacaoTotal: number;
    custoVisitaTecnicaTotal: number;
    custoCosernTotal: number;
    custoTrtCreaTotal: number;
    custoEngenheiroTotal: number;
    custoMaterialCATotal: number;
    custoImpostoTotal: number;
    comissaoVendedorTotal: number;
    custoTotalOperacional: number;
    lucroLiquidoTotal: number;
    margemLucroMedia: number;
    quantidadeVendas: number;
    ticketMedio: number;
    alertaMargemLucro: boolean;
    mensagemAlertaLucro: string | null;
    custoFixoMensal?: number;
    margemContribuicao?: number;
    resultadoOperacional?: number;
    margemReal?: number;
    pontoEquilibrio?: number;
    atipicas?: {
      quantidade: number;
      faturamento: number;
      lucroLiquido: number;
    };
  };
  comparacao: {
    mesAnterior: string;
    faturamentoAnterior: number;
    lucroAnterior: number;
    variacaoFaturamento: number;
    variacaoLucro: number;
  };
  vendas: VendaFinanceira[];
}

export default function DiretorDashboardPage() {
  const [dados, setDados] = useState<DadosFinanceiros | null>(null);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [vendaEditando, setVendaEditando] = useState<VendaEditavel | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMargem[]>([]);
  const [showSolicitacoes, setShowSolicitacoes] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [expandedVendaId, setExpandedVendaId] = useState<string | null>(null);

  useEffect(() => {
    fetchDados();
    fetchSolicitacoes();
  }, [mesAtual]);

  const fetchSolicitacoes = async () => {
    try {
      const res = await fetch("/api/diretor/solicitacoes-margem");
      if (res.ok) setSolicitacoes(await res.json());
    } catch {}
  };

  const processarSolicitacao = async (id: string, acao: "APROVAR" | "REJEITAR") => {
    setProcessandoId(id);
    try {
      const res = await fetch(`/api/diretor/solicitacoes-margem/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      if (res.ok) {
        await fetchSolicitacoes();
        await fetchDados(); // atualiza P&L se aprovado
      }
    } catch {}
    setProcessandoId(null);
  };

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diretor/financeiro?mes=${mesAtual}`);
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  const getMargemColor = (margem: number) => {
    if (margem >= 0.20 && margem <= 0.25) return "text-liv-sage";
    if (margem < 0.20) return "text-liv-danger";
    return "text-liv-gold";
  };

  const getMargemBg = (margem: number) => {
    if (margem >= 0.20 && margem <= 0.25) return "border-liv-sage/30";
    if (margem < 0.20) return "border-liv-danger/30";
    return "border-liv-gold/30";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-gold"></div>
      </div>
    );
  }

  const r = dados?.resumo;
  const c = dados?.comparacao;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Diretoria"
        title="Painel Financeiro"
        subtitle={getNomeMes(mesAtual)}
        actions={
          <>
            {solicitacoes.length > 0 && (
              <button
                onClick={() => setShowSolicitacoes(true)}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-liv-gold/10 border border-liv-gold/30 text-liv-gold text-sm font-medium hover:bg-liv-gold/20 transition"
              >
                <Bell className="w-4 h-4" />
                Aprovacoes Pendentes
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-liv-gold text-liv-bg text-xs rounded-full flex items-center justify-center font-bold">
                  {solicitacoes.length}
                </span>
              </button>
            )}
            <input
              type="month"
              value={mesAtual}
              onChange={(e) => setMesAtual(e.target.value)}
              className="px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm"
            />
          </>
        }
      />

      {/* Modal de aprovações pendentes */}
      {showSolicitacoes && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-liv-surface border border-liv-line rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-liv-line">
              <h2 className="text-lg font-bold text-liv-ink flex items-center gap-2">
                <Bell className="w-5 h-5 text-liv-gold" />
                Solicitacoes de Ajuste de Margem
              </h2>
              <button onClick={() => setShowSolicitacoes(false)} className="text-liv-muted hover:text-liv-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {solicitacoes.length === 0 ? (
                <p className="text-liv-faint text-center py-8">Nenhuma solicitacao pendente</p>
              ) : solicitacoes.map((s) => (
                <div key={s.id} className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-liv-ink">{s.clienteNome}</p>
                      <p className="text-xs text-liv-muted mt-0.5">Vendedor: {s.vendedorNome} | Solicitado por: {s.solicitante.nome}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-liv-muted">
                          Atual: <span className="text-liv-ink font-medium tabular-nums">{s.margemAtual.toFixed(2)}x</span>
                          <span className="text-liv-faint ml-1 tabular-nums">({formatCurrency(s.custoEquipAtual)})</span>
                        </span>
                        <span className="text-liv-gold">→</span>
                        <span className={s.novaMargem < 1.8 ? "text-liv-danger" : "text-liv-sage"}>
                          <span className="tabular-nums">{s.novaMargem.toFixed(2)}x</span>
                          <span className="text-liv-faint ml-1 tabular-nums">({formatCurrency(s.novoCustoEquipamentos)})</span>
                        </span>
                      </div>
                      <p className="text-xs text-liv-faint mt-1 tabular-nums">
                        Venda: {formatCurrency(s.venda.valorVenda)} | Ref: {s.venda.mesReferencia}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => processarSolicitacao(s.id, "APROVAR")}
                        disabled={processandoId === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-liv-sage/15 text-liv-sage text-xs font-medium hover:bg-liv-sage/25 transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => processarSolicitacao(s.id, "REJEITAR")}
                        disabled={processandoId === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-liv-danger/15 text-liv-danger text-xs font-medium hover:bg-liv-danger/25 transition disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <StatCard
          label="Faturamento"
          value={formatCurrency(r?.faturamentoTotal || 0)}
          tone="default"
          chart={
            <div className="w-9 h-9 bg-liv-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-liv-info" />
            </div>
          }
          meta={
            <span className={`flex items-center gap-1 tabular-nums ${(c?.variacaoFaturamento ?? 0) >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
              {(c?.variacaoFaturamento ?? 0) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(c?.variacaoFaturamento ?? 0).toFixed(1)}% vs mes anterior
            </span>
          }
        />

        {/* Custo Total */}
        <StatCard
          label="Custo Total"
          value={formatCurrency(r?.custoTotalOperacional || 0)}
          tone="negative"
          chart={
            <div className="w-9 h-9 bg-liv-danger/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-liv-danger" />
            </div>
          }
          meta={
            <span className="tabular-nums">
              {r?.quantidadeVendas || 0} vendas · Ticket medio {formatCurrency(r?.ticketMedio || 0)}
            </span>
          }
        />

        {/* Lucro Liquido */}
        <StatCard
          label="Lucro Liquido"
          value={formatCurrency(r?.lucroLiquidoTotal || 0)}
          tone={(r?.lucroLiquidoTotal ?? 0) >= 0 ? "positive" : "negative"}
          chart={
            <div className="w-9 h-9 bg-liv-sage/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-liv-sage" />
            </div>
          }
          meta={
            <span className={`flex items-center gap-1 tabular-nums ${(c?.variacaoLucro ?? 0) >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
              {(c?.variacaoLucro ?? 0) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(c?.variacaoLucro ?? 0).toFixed(1)}% vs mes anterior
            </span>
          }
        />

        {/* Margem de Lucro */}
        <StatCard
          label="Margem Lucro"
          value={<span className={getMargemColor(r?.margemLucroMedia || 0)}>{((r?.margemLucroMedia || 0) * 100).toFixed(1)}%</span>}
          tone="default"
          highlight={(r?.margemLucroMedia || 0) < 0.20}
          className={getMargemBg(r?.margemLucroMedia || 0)}
          chart={
            <div className="w-9 h-9 bg-liv-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Percent className="w-4 h-4 text-liv-gold" />
            </div>
          }
          meta="Meta: 20% - 25%"
        />
      </div>

      {/* Resultado Real (inclui custo fixo) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-liv-ink">Resultado real da empresa</h2>
          <span className="text-xs text-liv-muted tabular-nums">
            Custo fixo {formatCurrency(r?.custoFixoMensal ?? 40000)}/mes · editavel em configuracoes
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Margem de Contribuicao */}
          <StatCard
            label="Margem de Contribuicao"
            value={formatCurrency(r?.margemContribuicao ?? r?.lucroLiquidoTotal ?? 0)}
            tone="default"
            chart={
              <div className="w-9 h-9 bg-liv-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-liv-info" />
              </div>
            }
            meta={
              <span className="tabular-nums">
                {((r?.margemLucroMedia || 0) * 100).toFixed(1)}% · antes do custo fixo
              </span>
            }
          />

          {/* Custo Fixo */}
          <StatCard
            label="Custo Fixo Mensal"
            value={formatCurrency(r?.custoFixoMensal ?? 40000)}
            tone="negative"
            chart={
              <div className="w-9 h-9 bg-liv-danger/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-liv-danger" />
              </div>
            }
            meta="Aluguel, salarios, estrutura"
          />

          {/* Resultado Real */}
          <StatCard
            label="Resultado Real"
            value={formatCurrency(r?.resultadoOperacional ?? 0)}
            tone={(r?.resultadoOperacional ?? 0) >= 0 ? "positive" : "negative"}
            chart={
              <div className="w-9 h-9 bg-liv-sage/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-liv-sage" />
              </div>
            }
            meta={
              <span className="tabular-nums">
                Margem real {((r?.margemReal ?? 0) * 100).toFixed(1)}%
              </span>
            }
          />

          {/* Ponto de Equilibrio */}
          <StatCard
            label="Ponto de Equilibrio"
            value={formatCurrency(r?.pontoEquilibrio ?? 0)}
            tone="default"
            chart={
              <div className="w-9 h-9 bg-liv-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Percent className="w-4 h-4 text-liv-gold" />
              </div>
            }
            meta="Faturamento pra zerar o custo fixo"
          />
        </div>
      </div>

      {/* Vendas atipicas (fora dos indicadores acima) */}
      {r?.atipicas && r.atipicas.quantidade > 0 && (
        <div className="bg-liv-info/8 border border-liv-info/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-liv-info" />
            <h3 className="font-semibold text-liv-info">
              {r.atipicas.quantidade} venda{r.atipicas.quantidade > 1 ? "s" : ""} atipica{r.atipicas.quantidade > 1 ? "s" : ""} (fora dos indicadores)
            </h3>
          </div>
          <p className="text-sm text-liv-muted tabular-nums">
            Faturamento {formatCurrency(r.atipicas.faturamento)} · Lucro {formatCurrency(r.atipicas.lucroLiquido)}.
            Excecao operacional — nao entra na margem media nem no ticket pra nao distorcer a leitura.
          </p>
        </div>
      )}

      {/* Alerta de Margem */}
      {r?.alertaMargemLucro && r?.mensagemAlertaLucro && (
        <div className="bg-liv-gold/8 border border-liv-gold/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-liv-gold" />
            <h3 className="font-semibold text-liv-gold">Alerta de Margem</h3>
          </div>
          <p className="text-sm text-liv-gold">{r.mensagemAlertaLucro}</p>
        </div>
      )}

      {/* Detalhamento de Custos */}
      <Card className="border-liv-line bg-liv-surface">
        <CardContent className="p-6">
          <h2 className="font-semibold text-liv-ink mb-4">Detalhamento de Custos do Mes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Equipamentos</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoEquipamentosTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Instalacao</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoInstalacaoTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Impostos (6%)</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoImpostoTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Comissoes</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.comissaoVendedorTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Visita Tecnica</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoVisitaTecnicaTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">COSERN</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoCosernTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">TRT/CREA</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoTrtCreaTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Engenheiro</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoEngenheiroTotal || 0)}</p>
            </div>
            <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Material CA</p>
              <p className="text-lg font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(r?.custoMaterialCATotal || 0)}</p>
            </div>
            <div className="bg-liv-gold/8 rounded-lg p-4 ring-1 ring-liv-gold/20">
              <p className="text-xs text-liv-gold uppercase tracking-wider font-medium">Total Custos</p>
              <p className="text-lg font-bold text-liv-gold mt-1 tabular-nums">{formatCurrency(r?.custoTotalOperacional || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vendas Detalhada */}
      {dados?.vendas && dados.vendas.length > 0 && (
        <Card className="border-liv-line bg-liv-surface overflow-hidden">
          <div className="px-6 py-4 border-b border-liv-line">
            <h2 className="font-semibold text-liv-ink">Vendas do Mes - Visao Completa</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-liv-surface-2 text-liv-faint">
                <tr>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Vendedor</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Venda</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Equip.</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Placas</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Instal.</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Imposto</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Comissao</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Outros</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Lucro</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Margem</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {dados.vendas.map((v) => {
                  const outrosCustos = v.custoVisitaTecnica + v.custoCosern + v.custoTrtCrea + (v.custoEngenheiro || 0) + (v.custoMaterialCA || 0);
                  const formatDateStr = (d: string) => {
                    try {
                      const [y, m, day] = d.split("-");
                      return `${day}/${m}/${y}`;
                    } catch { return d; }
                  };
                  return (
                    <React.Fragment key={v.id}>
                    <tr
                      className={
                        v.margemLucroLiquido < 0.20
                          ? "bg-liv-danger/5 hover:bg-liv-danger/10"
                          : v.margemLucroLiquido >= 0.20 && v.margemLucroLiquido <= 0.25
                          ? "hover:bg-liv-sage/5"
                          : "hover:bg-liv-surface-2"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-liv-ink whitespace-nowrap">
                        {v.cliente}
                        {v.atipica && (
                          <span className="ml-2 inline-block px-2 py-0.5 text-[10px] rounded-full font-medium bg-liv-info/15 text-liv-info align-middle">
                            atipica
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-liv-muted whitespace-nowrap">{v.vendedor}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(v.valorVenda)}</td>
                      <td className="px-4 py-3 text-right text-liv-muted whitespace-nowrap tabular-nums">{formatCurrency(v.custoEquipamentos)}</td>
                      <td className="px-4 py-3 text-center text-liv-muted tabular-nums">{v.quantidadePlacas}</td>
                      <td className="px-4 py-3 text-right text-liv-muted whitespace-nowrap tabular-nums">{formatCurrency(v.custoInstalacao)}</td>
                      <td className="px-4 py-3 text-right text-liv-muted whitespace-nowrap tabular-nums">{formatCurrency(v.custoImposto)}</td>
                      <td className="px-4 py-3 text-right text-liv-muted whitespace-nowrap tabular-nums">{formatCurrency(v.comissaoVendedor)}</td>
                      <td className="px-4 py-3 text-right text-liv-muted whitespace-nowrap tabular-nums">{formatCurrency(outrosCustos)}</td>
                      <td className={`px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums ${v.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                        {formatCurrency(v.lucroLiquido)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium tabular-nums ${
                          v.margemLucroLiquido >= 0.20 && v.margemLucroLiquido <= 0.25
                            ? "bg-liv-sage/15 text-liv-sage"
                            : v.margemLucroLiquido < 0.20
                            ? "bg-liv-danger/10 text-liv-danger"
                            : "bg-liv-gold/10 text-liv-gold"
                        }`}>
                          {(v.margemLucroLiquido * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {(v.orcamentoUrl || (v.registrosSDR && v.registrosSDR.length > 0)) && (
                            <button
                              onClick={() => setExpandedVendaId(expandedVendaId === v.id ? null : v.id)}
                              className="p-1.5 rounded-lg hover:bg-liv-teal/10 text-liv-faint hover:text-liv-teal transition"
                              title="Ver detalhes SDR e orcamento"
                            >
                              {expandedVendaId === v.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                          {v.orcamentoUrl && (
                            <button
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = v.orcamentoUrl!;
                                link.download = `orcamento-${v.cliente.replace(/\s+/g, "-")}.pdf`;
                                link.click();
                              }}
                              className="p-1.5 rounded-lg hover:bg-liv-sage/10 text-liv-sage transition"
                              title="Baixar PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setVendaEditando({
                                id: v.id,
                                cliente: v.cliente,
                                vendedor: v.vendedor,
                                valorVenda: v.valorVenda,
                                custoEquipamentos: v.custoEquipamentos,
                                margem: v.margem,
                                quantidadePlacas: v.quantidadePlacas,
                                quantidadeInversores: v.quantidadeInversores,
                                custoInstalacao: v.custoInstalacao,
                                custoVisitaTecnica: v.custoVisitaTecnica,
                                custoCosern: v.custoCosern,
                                custoTrtCrea: v.custoTrtCrea,
                                custoEngenheiro: v.custoEngenheiro,
                                custoMaterialCA: v.custoMaterialCA,
                                custoImposto: v.custoImposto,
                                comissaoVendedor: v.comissaoVendedor,
                                lucroLiquido: v.lucroLiquido,
                                margemLucroLiquido: v.margemLucroLiquido,
                              });
                              setEditPanelOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-liv-gold/10 text-liv-faint hover:text-liv-gold transition"
                            title="Editar custos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {expandedVendaId === v.id && (
                      <tr className="bg-liv-surface-2">
                        <td colSpan={12} className="px-4 py-4">
                          <div className="space-y-4">
                            {/* Orcamento PDF */}
                            {v.orcamentoUrl && (
                              <div className="bg-liv-sage/5 border border-liv-sage/20 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-liv-sage" />
                                    <div>
                                      <p className="text-sm font-medium text-liv-sage">Orcamento PDF</p>
                                      <p className="text-xs text-liv-faint">Enviado pelo vendedor</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = v.orcamentoUrl!;
                                      link.download = `orcamento-${v.cliente.replace(/\s+/g, "-")}.pdf`;
                                      link.click();
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-liv-sage text-liv-bg text-xs font-medium hover:bg-liv-sage/90 transition"
                                  >
                                    Baixar PDF
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* SDR Info */}
                            {v.registrosSDR && v.registrosSDR.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-liv-teal uppercase tracking-wider flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" /> Informacoes do SDR
                                </p>
                                {v.registrosSDR.map((sdr) => (
                                  <div key={sdr.id} className="bg-liv-surface rounded-lg p-4 border border-liv-line space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                      <div>
                                        <p className="text-[11px] text-liv-faint uppercase">SDR</p>
                                        <p className="text-sm text-liv-ink">{sdr.sdrNome}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-liv-faint uppercase">Reuniao</p>
                                        <p className="text-sm text-liv-ink tabular-nums">{formatDateStr(sdr.dataReuniao)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-liv-faint uppercase">Compareceu</p>
                                        <p className={`text-sm font-medium ${sdr.compareceu ? "text-liv-sage" : "text-liv-danger"}`}>
                                          {sdr.compareceu ? "Sim" : "Nao"}
                                        </p>
                                      </div>
                                      {sdr.motivoNaoCompareceu && (
                                        <div>
                                          <p className="text-[11px] text-liv-faint uppercase">Motivo</p>
                                          <p className="text-sm text-liv-gold">{sdr.motivoNaoCompareceu}</p>
                                        </div>
                                      )}
                                    </div>
                                    {sdr.consideracoes && (
                                      <div>
                                        <p className="text-[11px] text-liv-faint uppercase mb-1 flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3" /> Consideracoes
                                        </p>
                                        <p className="text-sm text-liv-ink whitespace-pre-wrap bg-liv-surface-2 rounded-lg p-3 border border-liv-line">{sdr.consideracoes}</p>
                                      </div>
                                    )}
                                    {sdr.imagemUrl && (
                                      <div>
                                        <p className="text-[11px] text-liv-faint uppercase mb-1 flex items-center gap-1">
                                          <ImageIcon className="w-3 h-3" /> Documento
                                        </p>
                                        <img
                                          src={sdr.imagemUrl}
                                          alt="Documento"
                                          className="max-w-xs max-h-48 rounded-lg border border-liv-line cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(sdr.imagemUrl!, "_blank")}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {!v.orcamentoUrl && (!v.registrosSDR || v.registrosSDR.length === 0) && (
                              <p className="text-xs text-liv-faint italic">Nenhuma informacao adicional disponivel.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {/* Totais */}
              <tfoot className="bg-liv-surface-2 font-medium">
                <tr>
                  <td className="px-4 py-3 font-bold text-liv-ink" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(r?.faturamentoTotal || 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r?.custoEquipamentosTotal || 0)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r?.custoInstalacaoTotal || 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r?.custoImpostoTotal || 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r?.comissaoVendedorTotal || 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency((r?.custoVisitaTecnicaTotal || 0) + (r?.custoCosernTotal || 0) + (r?.custoTrtCreaTotal || 0) + (r?.custoEngenheiroTotal || 0) + (r?.custoMaterialCATotal || 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-liv-sage tabular-nums">{formatCurrency(r?.lucroLiquidoTotal || 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-bold tabular-nums ${
                      (r?.margemLucroMedia || 0) >= 0.20 && (r?.margemLucroMedia || 0) <= 0.25
                        ? "bg-liv-sage/15 text-liv-sage"
                        : "bg-liv-danger/10 text-liv-danger"
                    }`}>
                      {((r?.margemLucroMedia || 0) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Sem vendas */}
      {(!dados?.vendas || dados.vendas.length === 0) && (
        <Card className="border-liv-line bg-liv-surface">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-liv-faint mx-auto mb-4" />
            <h3 className="text-lg font-medium text-liv-ink mb-2">Nenhuma venda este mes</h3>
            <p className="text-liv-muted">Aguardando registro de vendas pelos vendedores.</p>
          </CardContent>
        </Card>
      )}

      {/* Panel de Edicao de Venda */}
      <EditVendaPanel
        venda={vendaEditando}
        isOpen={editPanelOpen}
        isDiretor={true}
        onClose={() => {
          setEditPanelOpen(false);
          setVendaEditando(null);
        }}
        onSaved={fetchDados}
      />
    </div>
  );
}

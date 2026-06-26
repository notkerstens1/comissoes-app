"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  DollarSign,
  Package,
  Banknote,
  TrendingUp,
  Loader2,
  CheckCircle,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";
import { Pencil } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { EditVendaPanel, VendaEditavel } from "@/components/EditVendaPanel";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

interface SDRInfo {
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

interface VendaFinanceiro {
  id: string;
  cliente: string;
  vendedor: string;
  vendedorId: string;
  valorVenda: number;
  custoEquipamentos: number;
  formaPagamento: string;
  distribuidora: string;
  comissaoVenda: number;
  comissaoOver: number;
  comissaoTotal: number;
  dataConversao: string;
  status: string;
  orcamentoUrl: string | null;
  kwp: number;
  quantidadePlacas: number;
  quantidadeInversores: number;
  registrosSDR: SDRInfo[];
  margem: number;
  over: number;
  custoInstalacao: number;
  custoVisitaTecnica: number;
  custoCosern: number;
  custoTrtCrea: number;
  custoEngenheiro: number;
  custoMaterialCA: number;
  custoImposto: number;
  lucroLiquido: number;
  margemLucroLiquido: number;
  percentualComissaoOverride: number | null;
  mesReferencia: string;
  excecao: boolean;
  historicoAlteracoes: string | null;
  comissaoVendaPaga: boolean;
  comissaoOverPaga: boolean;
}

interface DadosFinanceiro {
  vendas: VendaFinanceiro[];
  totalVendas: number;
  totalEquipamentos: number;
  totalComissoes: number;
  ticketMedio: number;
  mes: string;
}

export default function FinanceiroPage() {
  const [dados, setDados] = useState<DadosFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pagando, setPagando] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vendaEditando, setVendaEditando] = useState<VendaEditavel | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/vendas?mes=${mes}`);
      if (res.ok) {
        const data = await res.json();
        setDados(data);
      }
    } catch (err) {
      console.error("Erro ao buscar dados financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [mes]);

  const marcarComoPago = async (vendaId: string, tipo?: "VENDA" | "OVER") => {
    setPagando(vendaId);
    try {
      const res = await fetch("/api/financeiro/vendas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendaId, tipo }),
      });
      if (res.ok) {
        setDados((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            vendas: prev.vendas.map((v) => {
              if (v.id !== vendaId) return v;
              const newV = { ...v };
              if (tipo === "VENDA") newV.comissaoVendaPaga = true;
              else if (tipo === "OVER") newV.comissaoOverPaga = true;
              else { newV.comissaoVendaPaga = true; newV.comissaoOverPaga = true; }
              if (newV.comissaoVendaPaga && newV.comissaoOverPaga) newV.status = "PAGO";
              return newV;
            }),
          };
        });
      }
    } catch (err) {
      console.error("Erro ao marcar como pago:", err);
    } finally {
      setPagando(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Financeiro"
        title="Painel Financeiro"
        subtitle="Gestao de pagamentos e comissoes"
        actions={
          <>
            <NotificationBell />
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="px-4 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage/30 outline-none text-sm"
            />
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-liv-sage" />
        </div>
      ) : dados ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Vendas"
              value={formatCurrency(dados.totalVendas)}
              tone="default"
              meta={
                <span className="inline-flex items-center gap-1 text-liv-info">
                  <DollarSign className="w-3 h-3" />
                  faturamento bruto
                </span>
              }
            />
            <StatCard
              label="Equipamentos"
              value={formatCurrency(dados.totalEquipamentos)}
              tone="default"
              meta={
                <span className="inline-flex items-center gap-1 text-liv-orange">
                  <Package className="w-3 h-3" />
                  custo de materiais
                </span>
              }
            />
            <StatCard
              label="Total Comissoes"
              value={formatCurrency(dados.totalComissoes)}
              tone="positive"
              highlight
              meta={
                <span className="inline-flex items-center gap-1 text-liv-sage">
                  <Banknote className="w-3 h-3" />
                  a pagar / pago
                </span>
              }
            />
            <StatCard
              label="Ticket Medio"
              value={formatCurrency(dados.ticketMedio)}
              tone="default"
              meta={
                <span className="inline-flex items-center gap-1 text-liv-violet">
                  <TrendingUp className="w-3 h-3" />
                  por venda
                </span>
              }
            />
          </div>

          {/* Sales Table */}
          <div className="rounded-xl border border-liv-line bg-liv-surface overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-liv-line">
              <h2 className="font-semibold text-liv-ink">
                Vendas do Mes ({dados.vendas.length})
              </h2>
            </div>

            {dados.vendas.length === 0 ? (
              <div className="px-6 py-12 text-center text-liv-faint">
                Nenhuma venda neste periodo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-liv-surface-2 text-liv-faint">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 font-medium">Vendedor</th>
                      <th className="text-right px-4 py-3 font-medium">Valor Venda</th>
                      <th className="text-right px-4 py-3 font-medium">Equipamentos</th>
                      <th className="text-left px-4 py-3 font-medium">Distribuidora</th>
                      <th className="text-right px-4 py-3 font-medium">Com. Venda</th>
                      <th className="text-right px-4 py-3 font-medium">Com. Over</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-center px-4 py-3 font-medium">Data</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-liv-line">
                    {dados.vendas.map((v) => (
                      <React.Fragment key={v.id}>
                        <tr className="hover:bg-liv-surface-2/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-liv-ink">{v.cliente}</td>
                          <td className="px-4 py-3 text-liv-muted">{v.vendedor}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-liv-ink">{formatCurrency(v.valorVenda)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-liv-muted">{formatCurrency(v.custoEquipamentos)}</td>
                          <td className="px-4 py-3 text-liv-muted">{v.distribuidora || "-"}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-liv-faint">
                            {formatCurrency(v.comissaoVenda)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-liv-gold">
                            {formatCurrency(v.comissaoOver)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-liv-sage">
                            {formatCurrency(v.comissaoTotal)}
                          </td>
                          <td className="px-4 py-3 text-center text-liv-faint">{formatDate(v.dataConversao)}</td>
                          <td className="px-4 py-3 text-center">
                            {v.status === "AGUARDANDO" ? (
                              <Badge variant="gold">AGUARDANDO</Badge>
                            ) : (
                              <div className="flex flex-col gap-1 items-center">
                                {v.comissaoVendaPaga ? (
                                  <Badge variant="info">
                                    <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                    Venda
                                  </Badge>
                                ) : (
                                  <button
                                    onClick={() => marcarComoPago(v.id, "VENDA")}
                                    disabled={pagando === v.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg font-medium bg-liv-sage/15 text-liv-sage hover:bg-liv-sage/25 border border-liv-sage/30 transition disabled:opacity-50"
                                  >
                                    {pagando === v.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Banknote className="w-2.5 h-2.5" />}
                                    Pagar Venda
                                  </button>
                                )}
                                {v.comissaoOver > 0 && (
                                  v.comissaoOverPaga ? (
                                    <Badge variant="info">
                                      <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                      Over
                                    </Badge>
                                  ) : (
                                    <button
                                      onClick={() => marcarComoPago(v.id, "OVER")}
                                      disabled={pagando === v.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg font-medium bg-liv-gold/15 text-liv-gold hover:bg-liv-gold/25 border border-liv-gold/30 transition disabled:opacity-50"
                                    >
                                      {pagando === v.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Banknote className="w-2.5 h-2.5" />}
                                      Pagar Over
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setVendaEditando({
                                    id: v.id,
                                    cliente: v.cliente,
                                    vendedor: v.vendedor,
                                    valorVenda: v.valorVenda,
                                    custoEquipamentos: v.custoEquipamentos,
                                    margem: v.margem || 1.8,
                                    quantidadePlacas: v.quantidadePlacas || 0,
                                    quantidadeInversores: v.quantidadeInversores || 1,
                                    custoInstalacao: v.custoInstalacao || 0,
                                    custoVisitaTecnica: v.custoVisitaTecnica || 120,
                                    custoCosern: v.custoCosern || 70,
                                    custoTrtCrea: v.custoTrtCrea || 65,
                                    custoEngenheiro: v.custoEngenheiro || 400,
                                    custoMaterialCA: v.custoMaterialCA || 500,
                                    custoImposto: v.custoImposto || 0,
                                    lucroLiquido: v.lucroLiquido || 0,
                                    margemLucroLiquido: v.margemLucroLiquido || 0,
                                    comissaoVenda: v.comissaoVenda,
                                    comissaoOver: v.comissaoOver,
                                    comissaoTotal: v.comissaoTotal,
                                    over: v.over,
                                    vendedorId: v.vendedorId,
                                    mesReferencia: v.mesReferencia,
                                    excecao: v.excecao,
                                    historicoAlteracoes: v.historicoAlteracoes,
                                  });
                                  setEditPanelOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-liv-gold/10 text-liv-faint hover:text-liv-gold transition"
                                title="Editar venda"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {v.orcamentoUrl && (
                                <button
                                  onClick={() => {
                                    const link = document.createElement("a");
                                    link.href = v.orcamentoUrl!;
                                    link.download = `orcamento-${v.cliente.replace(/\s+/g, "-")}.pdf`;
                                    link.click();
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-liv-sage/10 text-liv-sage transition"
                                  title="Baixar Orcamento PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              {(v.registrosSDR.length > 0 || v.orcamentoUrl) && (
                                <button
                                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                                  className="p-1.5 rounded-lg hover:bg-liv-info/10 text-liv-faint hover:text-liv-info transition"
                                  title="Ver detalhes"
                                >
                                  {expandedId === v.id ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {expandedId === v.id && (
                          <tr className="bg-liv-surface-2">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="space-y-4">
                                {/* Sale details */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-liv-surface rounded-lg p-3 border border-liv-line">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">kWp</p>
                                    <p className="text-sm text-liv-ink font-medium">{v.kwp}</p>
                                  </div>
                                  <div className="bg-liv-surface rounded-lg p-3 border border-liv-line">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">Placas</p>
                                    <p className="text-sm text-liv-ink font-medium">{v.quantidadePlacas}</p>
                                  </div>
                                  <div className="bg-liv-surface rounded-lg p-3 border border-liv-line">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">Inversores</p>
                                    <p className="text-sm text-liv-ink font-medium">{v.quantidadeInversores}</p>
                                  </div>
                                  <div className="bg-liv-surface rounded-lg p-3 border border-liv-line">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">Pagamento</p>
                                    <p className="text-sm text-liv-ink font-medium">{v.formaPagamento || "-"}</p>
                                  </div>
                                </div>

                                {/* Orcamento PDF */}
                                {v.orcamentoUrl && (
                                  <div className="bg-liv-sage/5 border border-liv-sage/20 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-liv-sage" />
                                        <div>
                                          <p className="text-sm font-medium text-liv-sage">Orcamento PDF</p>
                                          <p className="text-xs text-liv-faint">Enviado pelo vendedor ao fechar a venda</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement("a");
                                          link.href = v.orcamentoUrl!;
                                          link.download = `orcamento-${v.cliente.replace(/\s+/g, "-")}.pdf`;
                                          link.click();
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-liv-sage text-liv-bg text-xs font-medium hover:bg-liv-sage-deep transition"
                                      >
                                        Baixar PDF
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* SDR Info */}
                                {v.registrosSDR.length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-xs font-semibold text-liv-info uppercase tracking-wider flex items-center gap-1">
                                      <Eye className="w-3.5 h-3.5" /> Informacoes do SDR
                                    </p>
                                    {v.registrosSDR.map((sdr) => (
                                      <div key={sdr.id} className="bg-liv-surface rounded-lg p-4 space-y-3 border border-liv-line">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                          <div>
                                            <p className="text-[11px] text-liv-faint uppercase">SDR</p>
                                            <p className="text-sm text-liv-ink">{sdr.sdrNome}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] text-liv-faint uppercase">Reuniao</p>
                                            <p className="text-sm text-liv-ink">{formatDate(sdr.dataReuniao)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] text-liv-faint uppercase">Compareceu</p>
                                            <p className={cn("text-sm font-medium", sdr.compareceu ? "text-liv-sage" : "text-liv-danger")}>
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
                                            <p className="text-sm text-liv-muted whitespace-pre-wrap bg-liv-surface-2 rounded-lg p-3">{sdr.consideracoes}</p>
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
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot className="bg-liv-surface-2 border-t border-liv-line">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-liv-ink" colSpan={2}>
                        Total ({dados.vendas.length} vendas)
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-liv-ink">
                        {formatCurrency(dados.totalVendas)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-liv-muted">
                        {formatCurrency(dados.totalEquipamentos)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-liv-sage">
                        {formatCurrency(dados.totalComissoes)}
                      </td>
                      <td className="px-4 py-3" colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center text-liv-faint py-12">Erro ao carregar dados</div>
      )}
      <EditVendaPanel
        venda={vendaEditando}
        isOpen={editPanelOpen}
        onClose={() => { setEditPanelOpen(false); setVendaEditando(null); }}
        onSaved={() => { setEditPanelOpen(false); setVendaEditando(null); fetchDados(); }}
      />
    </div>
  );
}

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

const statusColors: Record<string, string> = {
  AGUARDANDO: "bg-yellow-400/10 text-yellow-400",
  APROVADO: "bg-lime-400/15 text-lime-400",
  PAGO: "bg-blue-400/10 text-blue-400",
};

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Painel Financeiro</h1>
          <p className="text-gray-400">Gestao de pagamentos e comissoes</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 focus:ring-2 focus:ring-emerald-400/30 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : dados ? (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              label="Total Vendas"
              value={formatCurrency(dados.totalVendas)}
              icon={DollarSign}
              color="text-blue-400"
              bg="bg-blue-400/10"
            />
            <Card
              label="Equipamentos"
              value={formatCurrency(dados.totalEquipamentos)}
              icon={Package}
              color="text-orange-400"
              bg="bg-orange-400/10"
            />
            <Card
              label="Total Comissoes"
              value={formatCurrency(dados.totalComissoes)}
              icon={Banknote}
              color="text-emerald-400"
              bg="bg-emerald-400/10"
              highlight
            />
            <Card
              label="Ticket Medio"
              value={formatCurrency(dados.ticketMedio)}
              icon={TrendingUp}
              color="text-purple-400"
              bg="bg-purple-400/10"
            />
          </div>

          {/* Tabela */}
          <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#232a3b]">
              <h2 className="font-semibold text-gray-100">
                Vendas do Mes ({dados.vendas.length})
              </h2>
            </div>

            {dados.vendas.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Nenhuma venda neste periodo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#141820] text-gray-400">
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
                  <tbody className="divide-y divide-[#232a3b]">
                    {dados.vendas.map((v) => (
                      <React.Fragment key={v.id}>
                        <tr className="hover:bg-[#232a3b]/50">
                          <td className="px-4 py-3 font-medium text-gray-100">{v.cliente}</td>
                          <td className="px-4 py-3 text-gray-300">{v.vendedor}</td>
                          <td className="px-4 py-3 text-right text-gray-100">{formatCurrency(v.valorVenda)}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(v.custoEquipamentos)}</td>
                          <td className="px-4 py-3 text-gray-300">{v.distribuidora || "-"}</td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {formatCurrency(v.comissaoVenda)}
                          </td>
                          <td className="px-4 py-3 text-right text-yellow-400">
                            {formatCurrency(v.comissaoOver)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-400">
                            {formatCurrency(v.comissaoTotal)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400">{formatDate(v.dataConversao)}</td>
                          <td className="px-4 py-3 text-center">
                            {v.status === "AGUARDANDO" ? (
                              <span className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${statusColors.AGUARDANDO}`}>
                                AGUARDANDO
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1 items-center">
                                {v.comissaoVendaPaga ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-medium bg-blue-400/10 text-blue-400">
                                    <CheckCircle className="w-2.5 h-2.5" />
                                    Venda
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => marcarComoPago(v.id, "VENDA")}
                                    disabled={pagando === v.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg font-medium bg-emerald-400/20 text-emerald-400 hover:bg-emerald-400/30 border border-emerald-400/30 transition disabled:opacity-50"
                                  >
                                    {pagando === v.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Banknote className="w-2.5 h-2.5" />}
                                    Pagar Venda
                                  </button>
                                )}
                                {v.comissaoOver > 0 && (
                                  v.comissaoOverPaga ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-medium bg-blue-400/10 text-blue-400">
                                      <CheckCircle className="w-2.5 h-2.5" />
                                      Over
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => marcarComoPago(v.id, "OVER")}
                                      disabled={pagando === v.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg font-medium bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30 border border-yellow-400/30 transition disabled:opacity-50"
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
                                className="p-1.5 rounded-lg hover:bg-amber-400/10 text-gray-500 hover:text-amber-400 transition"
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
                                  className="p-1.5 rounded-lg hover:bg-lime-400/10 text-lime-400 transition"
                                  title="Baixar Orcamento PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              {(v.registrosSDR.length > 0 || v.orcamentoUrl) && (
                                <button
                                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                                  className="p-1.5 rounded-lg hover:bg-sky-400/10 text-gray-500 hover:text-sky-400 transition"
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
                          <tr className="bg-[#141820]">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="space-y-4">
                                {/* Sale details */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-[#1a1f2e] rounded-lg p-3">
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">kWp</p>
                                    <p className="text-sm text-gray-100 font-medium">{v.kwp}</p>
                                  </div>
                                  <div className="bg-[#1a1f2e] rounded-lg p-3">
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Placas</p>
                                    <p className="text-sm text-gray-100 font-medium">{v.quantidadePlacas}</p>
                                  </div>
                                  <div className="bg-[#1a1f2e] rounded-lg p-3">
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Inversores</p>
                                    <p className="text-sm text-gray-100 font-medium">{v.quantidadeInversores}</p>
                                  </div>
                                  <div className="bg-[#1a1f2e] rounded-lg p-3">
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Pagamento</p>
                                    <p className="text-sm text-gray-100 font-medium">{v.formaPagamento || "-"}</p>
                                  </div>
                                </div>

                                {/* Orcamento PDF */}
                                {v.orcamentoUrl && (
                                  <div className="bg-lime-400/5 border border-lime-400/20 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-lime-400" />
                                        <div>
                                          <p className="text-sm font-medium text-lime-400">Orcamento PDF</p>
                                          <p className="text-xs text-gray-500">Enviado pelo vendedor ao fechar a venda</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement("a");
                                          link.href = v.orcamentoUrl!;
                                          link.download = `orcamento-${v.cliente.replace(/\s+/g, "-")}.pdf`;
                                          link.click();
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-lime-400 text-gray-900 text-xs font-medium hover:bg-lime-500 transition"
                                      >
                                        Baixar PDF
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* SDR Info */}
                                {v.registrosSDR.length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                                      <Eye className="w-3.5 h-3.5" /> Informacoes do SDR
                                    </p>
                                    {v.registrosSDR.map((sdr) => (
                                      <div key={sdr.id} className="bg-[#1a1f2e] rounded-lg p-4 space-y-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                          <div>
                                            <p className="text-[11px] text-gray-500 uppercase">SDR</p>
                                            <p className="text-sm text-gray-100">{sdr.sdrNome}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] text-gray-500 uppercase">Reuniao</p>
                                            <p className="text-sm text-gray-100">{formatDate(sdr.dataReuniao)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] text-gray-500 uppercase">Compareceu</p>
                                            <p className={`text-sm font-medium ${sdr.compareceu ? "text-emerald-400" : "text-red-400"}`}>
                                              {sdr.compareceu ? "Sim" : "Nao"}
                                            </p>
                                          </div>
                                          {sdr.motivoNaoCompareceu && (
                                            <div>
                                              <p className="text-[11px] text-gray-500 uppercase">Motivo</p>
                                              <p className="text-sm text-amber-400">{sdr.motivoNaoCompareceu}</p>
                                            </div>
                                          )}
                                        </div>
                                        {sdr.consideracoes && (
                                          <div>
                                            <p className="text-[11px] text-gray-500 uppercase mb-1 flex items-center gap-1">
                                              <MessageSquare className="w-3 h-3" /> Consideracoes
                                            </p>
                                            <p className="text-sm text-gray-200 whitespace-pre-wrap bg-[#141820] rounded-lg p-3">{sdr.consideracoes}</p>
                                          </div>
                                        )}
                                        {sdr.imagemUrl && (
                                          <div>
                                            <p className="text-[11px] text-gray-500 uppercase mb-1 flex items-center gap-1">
                                              <ImageIcon className="w-3 h-3" /> Documento
                                            </p>
                                            <img
                                              src={sdr.imagemUrl}
                                              alt="Documento"
                                              className="max-w-xs max-h-48 rounded-lg border border-[#232a3b] cursor-pointer hover:opacity-80"
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
                  <tfoot className="bg-[#141820] border-t border-[#232a3b]">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-100" colSpan={2}>
                        Total ({dados.vendas.length} vendas)
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-100">
                        {formatCurrency(dados.totalVendas)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-300">
                        {formatCurrency(dados.totalEquipamentos)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
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
        <div className="text-center text-gray-500 py-12">Erro ao carregar dados</div>
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

function Card({
  label,
  value,
  icon: Icon,
  color,
  bg,
  highlight,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]",
        highlight && "ring-1 ring-emerald-400/30"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", bg)}>
          <Icon className={cn("w-4.5 h-4.5", color)} />
        </div>
      </div>
      <p className={cn("text-2xl font-bold", highlight ? "text-emerald-400" : "text-gray-100")}>
        {value}
      </p>
    </div>
  );
}

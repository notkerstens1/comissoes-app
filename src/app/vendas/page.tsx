"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { isAdmin as checkAdmin, isVendedor as checkIsVendedor } from "@/lib/roles";
import CurrencyInput from "@/components/CurrencyInput";
import { EditVendaPanel, VendaEditavel } from "@/components/EditVendaPanel";
import { DateRangeFilter, DatePreset } from "@/components/performance/DateRangeFilter";
import {
  getRangeFromPreset,
  formatCustomRangeLabel,
  getMonthRange,
  getRecentMonths,
  getMesAtual,
  getNomeMes,
} from "@/lib/dates";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Calculator,
  ShieldAlert,
  X,
  ChevronDown,
  Edit2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { PageHeader } from "@/components/ui/page-header";

function buildPeriodoLabel(preset: DatePreset, start: string, end: string): string {
  if (preset === "custom") return formatCustomRangeLabel(start, end);
  if (preset === "month") return getNomeMes(start.slice(0, 7));
  return getRangeFromPreset(preset).label;
}

interface Venda {
  id: string;
  cliente: string;
  formaPagamento: string;
  distribuidora: string;
  valorVenda: number;
  kwp: number;
  custoEquipamentos: number;
  geracaoKwh: number;
  over: number;
  margem: number;
  comissaoVenda: number;
  comissaoOver: number;
  comissaoTotal: number;
  dataConversao: string;
  fonte: string;
  status: string;
  comissaoVendaPaga: boolean;
  comissaoOverPaga: boolean;
  vendedor?: { nome: string };
  // Campos extras para edição (admin)
  quantidadePlacas?: number;
  quantidadeInversores?: number;
  custoInstalacao?: number;
  custoVisitaTecnica?: number;
  custoCosern?: number;
  custoTrtCrea?: number;
  custoEngenheiro?: number;
  custoMaterialCA?: number;
  custoImposto?: number;
  lucroLiquido?: number;
  margemLucroLiquido?: number;
  vendedorId?: string;
  mesReferencia?: string;
  excecao?: boolean;
  historicoAlteracoes?: string;
  tipoVenda?: string;
  statusContrato?: string;
}

export default function VendasPage() {
  const { data: session } = useSession();
  const admin = checkAdmin(session?.user?.role);
  const isHibrido = session?.user?.role === "VENDEDOR_HIBRIDO";
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendaEditando, setVendaEditando] = useState<VendaEditavel | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"vendas" | "extrato">("vendas");
  // Filtro de periodo (preset + range customizado). Padrao: seletor de mes,
  // que e a forma mais estavel de navegar mes a mes (sem depender do range de datas).
  const [periodPreset, setPeriodPreset] = useState<DatePreset>("month");
  const [selectedMonth, setSelectedMonth] = useState(getMesAtual());
  const monthOptions = getRecentMonths();
  const initialRange = getMonthRange(getMesAtual());
  const [periodStart, setPeriodStart] = useState(initialRange.start);
  const [periodEnd, setPeriodEnd] = useState(initialRange.end);
  const periodoLabel = buildPeriodoLabel(periodPreset, periodStart, periodEnd);
  // Mantido para compat: deriva mes-referencia do inicio do range (usado em alguns lugares ainda)
  const mesAtual = periodStart.slice(0, 7);

  // Filtro por vendedor (admin/diretor)
  const [vendedorFiltro, setVendedorFiltro] = useState("");
  const [vendedores, setVendedores] = useState<{ id: string; nome: string; role: string }[]>([]);

  // --- Nova Venda (accordion) ---
  const [formAberto, setFormAberto] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formErro, setFormErro] = useState("");
  const [formSucesso, setFormSucesso] = useState(false);
  const [showModalMargem, setShowModalMargem] = useState(false);
  const formContentRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState(0);

  // Campos do formulario
  const [cliente, setCliente] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [distribuidora, setDistribuidora] = useState("");
  const [dataConversao, setDataConversao] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fonte, setFonte] = useState("");
  const [tipoVenda, setTipoVenda] = useState<"INBOUND" | "EXTERNA">("INBOUND");
  const [statusContrato, setStatusContrato] = useState<"COMPLETO" | "A_FINALIZAR">("COMPLETO");
  const [quantidadePlacas, setQuantidadePlacas] = useState("");

  // Valores monetarios
  const [valorVendaDisplay, setValorVendaDisplay] = useState("");
  const [valorVendaNum, setValorVendaNum] = useState(0);
  const [custoEquipDisplay, setCustoEquipDisplay] = useState("");
  const [custoEquipNum, setCustoEquipNum] = useState(0);
  const [kwpDisplay, setKwpDisplay] = useState("");
  const [kwpNum, setKwpNum] = useState(0);

  // Callbacks para CurrencyInput
  const handleValorVenda = useCallback((num: number, display: string) => {
    setValorVendaNum(num);
    setValorVendaDisplay(display);
  }, []);

  const handleCustoEquip = useCallback((num: number, display: string) => {
    setCustoEquipNum(num);
    setCustoEquipDisplay(display);
  }, []);

  const handleKwp = useCallback((num: number, display: string) => {
    setKwpNum(num);
    setKwpDisplay(display);
  }, []);

  // Calculos em tempo real
  const valor = valorVendaNum;
  const equipamentos = custoEquipNum;
  const kwpCalc = kwpNum;

  const margem = equipamentos > 0 ? valor / equipamentos : 0;
  const over = margem >= 1.8 ? Math.max(valor - equipamentos * 1.8, 0) : 0;
  const geracaoKwh = kwpCalc * 136;
  const comissaoVenda = valor * 0.025;
  const alertaMargem = margem > 0 && margem < 1.8;

  // Medir altura do conteudo do formulario para animacao
  useEffect(() => {
    if (formContentRef.current) {
      const observer = new ResizeObserver(() => {
        if (formContentRef.current) {
          setFormHeight(formContentRef.current.scrollHeight);
        }
      });
      observer.observe(formContentRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Atualizar altura quando o form abre/fecha ou campos mudam
  useEffect(() => {
    if (formContentRef.current) {
      setFormHeight(formContentRef.current.scrollHeight);
    }
  }, [formAberto, alertaMargem, formErro, formSucesso, valor, equipamentos, kwpCalc]);

  // Abrir o formulario "Nova Venda" automaticamente quando o vendedor chega
  // via /vendas/nova (redirect com ?novaVenda=1). Mantem o atalho do Daniel
  // funcionando, mas integrado em Minhas Vendas em vez de tela separada.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("novaVenda") === "1" && checkIsVendedor(session?.user?.role)) {
      setAbaAtiva("vendas");
      setFormAberto(true);
    }
  }, [session?.user?.role]);

  const resetForm = () => {
    setCliente("");
    setFormaPagamento("");
    setDistribuidora("");
    setDataConversao(new Date().toISOString().split("T")[0]);
    setFonte("");
    setTipoVenda("INBOUND");
    setStatusContrato("COMPLETO");
    setQuantidadePlacas("");
    setValorVendaDisplay("");
    setValorVendaNum(0);
    setCustoEquipDisplay("");
    setCustoEquipNum(0);
    setKwpDisplay("");
    setKwpNum(0);
    setFormErro("");
    setFormSucesso(false);
  };

  const salvarVenda = async () => {
    setFormErro("");
    setFormLoading(true);
    setShowModalMargem(false);

    try {
      const isExterna = isHibrido && tipoVenda === "EXTERNA";
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente,
          formaPagamento,
          distribuidora,
          valorVenda: valor,
          kwp: kwpCalc,
          custoEquipamentos: equipamentos,
          quantidadePlacas: parseInt(quantidadePlacas) || 0,
          dataConversao,
          fonte: isExterna ? "EXTERNO" : fonte,
          statusContrato,
          ...(isHibrido ? { tipoVenda } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar venda");
      }

      setFormSucesso(true);
      setTimeout(() => {
        resetForm();
        setFormAberto(false);
        fetchVendas();
      }, 1200);
    } catch (error: any) {
      setFormErro(error.message);
    }
    setFormLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (alertaMargem) {
      setShowModalMargem(true);
      return;
    }

    await salvarVenda();
  };

  // Carregar lista de vendedores para admin/diretor
  useEffect(() => {
    if (admin) {
      fetch("/api/admin/vendedores")
        .then((r) => r.json())
        .then((data) => {
          const vendedoresAtivos = data
            // So inclui o "time de vendas" real (VENDEDOR / VENDEDOR_EXTERNO /
            // VENDEDOR_HIBRIDO). Erick (DIRETOR) e Erick Lima (ADMIN) nao
            // aparecem aqui mesmo que eventualmente tenham vendas atribuidas.
            .filter((v: any) => v.ativo && checkIsVendedor(v.role))
            .map((v: any) => ({ id: v.id, nome: v.nome, role: v.role }));
          setVendedores(vendedoresAtivos);
        })
        .catch(console.error);
    }
  }, [admin]);

  // --- Lista de Vendas ---
  useEffect(() => {
    fetchVendas();
  }, [periodStart, periodEnd, vendedorFiltro]);

  const fetchVendas = async () => {
    setLoading(true);
    try {
      let url = `/api/vendas?startDate=${periodStart}&endDate=${periodEnd}`;
      if (vendedorFiltro) url += `&vendedor=${vendedorFiltro}`;
      const res = await fetch(url);
      const data = await res.json();
      setVendas(data);
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const excluirVenda = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta venda?")) return;
    try {
      await fetch(`/api/vendas/${id}`, { method: "DELETE" });
      fetchVendas();
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  // Alternar o status do contrato (A_FINALIZAR <-> COMPLETO) direto na lista.
  // Permissao final é checada no backend (dono da venda + supervisor/diretor).
  const toggleStatusContrato = async (v: Venda) => {
    const novo = v.statusContrato === "A_FINALIZAR" ? "COMPLETO" : "A_FINALIZAR";
    const msg =
      novo === "COMPLETO"
        ? `Marcar a venda de ${v.cliente} como FECHADA por completo (empresa + banco)?`
        : `Marcar a venda de ${v.cliente} como A FINALIZAR (ainda tem algo em aberto)?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/vendas/${v.id}/contrato`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusContrato: novo }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar status do contrato");
      }
      fetchVendas();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const totalVendido = vendas.reduce((sum, v) => sum + v.valorVenda, 0);
  const totalEquipamentos = vendas.reduce((sum, v) => sum + v.custoEquipamentos, 0);
  const totalOver = vendas.reduce((sum, v) => sum + v.over, 0);
  const totalComissaoVenda = vendas.reduce((sum, v) => sum + v.comissaoVenda, 0);
  const totalComissaoOver = vendas.reduce((sum, v) => sum + v.comissaoOver, 0);
  const totalComissao = vendas.reduce((sum, v) => sum + v.comissaoTotal, 0);
  // Margem media ponderada pelo valor da venda (vendas maiores pesam mais)
  const margemMedia = totalVendido > 0
    ? vendas.reduce((sum, v) => sum + v.margem * v.valorVenda, 0) / totalVendido
    : 0;


  return (
    <div className="space-y-6">
      {/* MODAL DE CONFIRMACAO - MARGEM BAIXA */}
      {showModalMargem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-liv-surface rounded-2xl max-w-md w-full shadow-lg">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-6 border-b border-liv-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-liv-gold/10 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-liv-gold" />
                </div>
                <h3 className="font-bold text-lg text-liv-ink">Margem Abaixo de 1.8x</h3>
              </div>
              <button
                onClick={() => setShowModalMargem(false)}
                className="text-liv-faint hover:text-liv-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="p-6 space-y-4">
              <div className="bg-liv-gold/10 border border-liv-gold/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-liv-gold">Cliente</span>
                  <span className="font-medium text-liv-gold">{cliente}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-liv-gold">Valor da Venda</span>
                  <span className="font-medium text-liv-gold tabular-nums">{formatCurrency(valor)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-liv-gold">Margem</span>
                  <span className="font-bold text-liv-danger tabular-nums">{formatNumber(margem)}x</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-liv-muted">
                  Esta venda esta com margem de <strong className="text-liv-danger">{formatNumber(margem)}x</strong>, abaixo do minimo de <strong>1.8x</strong>.
                </p>
                <p className="text-sm text-liv-muted">
                  Voce <strong>nao recebera comissao sobre o over</strong> desta venda, apenas a comissao de 2,5% (<span className="tabular-nums">{formatCurrency(comissaoVenda)}</span>).
                </p>
                <p className="text-sm font-medium text-liv-gold mt-3">
                  Voce confirmou esta margem com seu supervisor?
                </p>
              </div>
            </div>

            {/* Botoes do modal */}
            <div className="p-6 border-t border-liv-line flex gap-3">
              <button
                onClick={() => setShowModalMargem(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-liv-line text-liv-muted font-medium hover:bg-liv-line transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarVenda}
                disabled={formLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-liv-sage text-liv-bg font-medium hover:bg-liv-sage-deep transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg"></div>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Sim, supervisor aprovou
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        eyebrow="Vendas"
        title={admin ? "Todas as Vendas" : "Minhas Vendas"}
        subtitle={periodoLabel}
        actions={
          <div className="flex gap-3 flex-wrap items-center">
            {!admin && <NotificationBell />}
            {admin && vendedores.length > 0 && (
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink"
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            )}
            {!admin && (
              <button
                onClick={() => {
                  if (formAberto) { resetForm(); }
                  setFormAberto(!formAberto);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                  formAberto
                    ? "bg-liv-surface-2 text-liv-muted hover:bg-liv-line"
                    : "bg-liv-sage text-liv-bg hover:bg-liv-sage-deep"
                }`}
              >
                <Plus className={`w-4 h-4 transition-transform duration-300 ${formAberto ? "rotate-45" : ""}`} />
                Nova Venda
              </button>
            )}
          </div>
        }
      />

      {/* Filtro de periodo (presets + range customizado) */}
      <DateRangeFilter
        preset={periodPreset}
        startDate={periodStart}
        endDate={periodEnd}
        label={`Mostrando: ${periodoLabel} · ${vendas.length} venda${vendas.length === 1 ? "" : "s"}`}
        presets={["month", "30d", "7d", "current_week", "custom"]}
        monthOptions={monthOptions}
        selectedMonth={selectedMonth}
        onMonthChange={(m) => {
          setSelectedMonth(m);
          const r = getMonthRange(m);
          setPeriodStart(r.start);
          setPeriodEnd(r.end);
        }}
        onPresetChange={(p) => {
          setPeriodPreset(p);
          if (p === "month") {
            const r = getMonthRange(selectedMonth);
            setPeriodStart(r.start);
            setPeriodEnd(r.end);
          } else if (p !== "custom") {
            const r = getRangeFromPreset(p);
            setPeriodStart(r.start);
            setPeriodEnd(r.end);
          }
        }}
        onCustomRangeChange={(s, e) => {
          setPeriodStart(s);
          setPeriodEnd(e);
        }}
      />

      {/* Tabs */}
      {!admin && (
        <div className="flex gap-1 bg-liv-surface border border-liv-line rounded-xl p-1 w-fit">
          <button
            onClick={() => setAbaAtiva("vendas")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "vendas"
                ? "bg-liv-sage text-liv-bg"
                : "text-liv-muted hover:text-liv-ink"
            }`}
          >
            Minhas Vendas
          </button>
          <button
            onClick={() => setAbaAtiva("extrato")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "extrato"
                ? "bg-liv-sage text-liv-bg"
                : "text-liv-muted hover:text-liv-ink"
            }`}
          >
            Extrato de Comissões
          </button>
        </div>
      )}

      {/* ── ABA: EXTRATO DE COMISSÕES ── */}
      {!admin && abaAtiva === "extrato" && (() => {
        const recebido = vendas.reduce((s, v) =>
          s + (v.comissaoVendaPaga ? v.comissaoVenda : 0) + (v.comissaoOverPaga ? v.comissaoOver : 0), 0);
        const pendente = vendas.reduce((s, v) =>
          s + (!v.comissaoVendaPaga ? v.comissaoVenda : 0) + (!v.comissaoOverPaga ? v.comissaoOver : 0), 0);
        return (
          <div className="space-y-4">
            {/* Cards resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
                <p className="text-sm text-liv-muted">Total do periodo</p>
                <p className="text-xl font-bold text-liv-sage mt-1 tabular-nums">{formatCurrency(totalComissao)}</p>
                <p className="text-xs text-liv-faint mt-1">{vendas.length} vendas</p>
              </div>
              <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
                <p className="text-sm text-liv-muted">Recebido</p>
                <p className="text-xl font-bold text-liv-sage mt-1 tabular-nums">{formatCurrency(recebido)}</p>
                <p className="text-xs text-liv-faint mt-1">pago pelo financeiro</p>
              </div>
              <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
                <p className="text-sm text-liv-muted">Pendente</p>
                <p className="text-xl font-bold text-liv-gold mt-1 tabular-nums">{formatCurrency(pendente)}</p>
                <p className="text-xs text-liv-faint mt-1">aguardando pagamento</p>
              </div>
            </div>

            {/* Tabela extrato */}
            {vendas.length === 0 ? (
              <div className="bg-liv-surface rounded-xl p-12 border border-liv-line text-center">
                <p className="text-liv-muted">Nenhuma venda neste periodo.</p>
              </div>
            ) : (
              <div className="bg-liv-surface rounded-xl border border-liv-line overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-liv-surface-2 text-liv-muted">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Cliente</th>
                        <th className="text-center px-4 py-3 font-medium">Data</th>
                        <th className="text-right px-4 py-3 font-medium">Valor Venda</th>
                        <th className="text-right px-4 py-3 font-medium">Com. Venda (2,5%)</th>
                        <th className="text-right px-4 py-3 font-medium">Com. Over (35%)</th>
                        <th className="text-right px-4 py-3 font-medium">Total</th>
                        <th className="text-center px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-liv-line">
                      {vendas.map((v) => (
                        <tr key={v.id} className="hover:bg-liv-surface-2">
                          <td className="px-4 py-3 font-medium text-liv-ink">{v.cliente}</td>
                          <td className="px-4 py-3 text-center text-liv-muted">
                            {new Date(v.dataConversao).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-right text-liv-muted tabular-nums">{formatCurrency(v.valorVenda)}</td>
                          <td className="px-4 py-3 text-right text-liv-muted tabular-nums">
                            {formatCurrency(v.comissaoVenda)}
                            {v.comissaoVendaPaga && (
                              <span className="ml-1 text-xs text-liv-sage">✓</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-liv-gold tabular-nums">
                            {formatCurrency(v.comissaoOver)}
                            {v.comissaoOverPaga && (
                              <span className="ml-1 text-xs text-liv-sage">✓</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-liv-sage tabular-nums">
                            {formatCurrency(v.comissaoTotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.status === "PAGO" ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-liv-sage/10 text-liv-sage">Recebido</span>
                            ) : v.comissaoVendaPaga || v.comissaoOverPaga ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-liv-info/10 text-liv-info">Parcial</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-liv-gold/10 text-liv-gold">Pendente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-liv-sage/10 font-semibold">
                      <tr>
                        <td className="px-4 py-3 text-liv-sage" colSpan={3}>TOTAIS DO PERIODO</td>
                        <td className="px-4 py-3 text-right text-liv-muted tabular-nums">{formatCurrency(totalComissaoVenda)}</td>
                        <td className="px-4 py-3 text-right text-liv-gold tabular-nums">{formatCurrency(totalComissaoOver)}</td>
                        <td className="px-4 py-3 text-right text-liv-sage tabular-nums">{formatCurrency(totalComissao)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ABA: MINHAS VENDAS ── */}
      {(admin || abaAtiva === "vendas") && <>

      {/* Accordion - Nova Venda Form (apenas vendedores) */}
      {!admin && <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: formAberto ? `${formHeight + 32}px` : "0px",
          opacity: formAberto ? 1 : 0,
        }}
      >
        <div ref={formContentRef}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario */}
            <div className="lg:col-span-2">
              <form onSubmit={handleFormSubmit} className="bg-liv-surface rounded-xl p-6 shadow-sm border border-liv-line space-y-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-liv-ink">Registrar Nova Venda</h2>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setFormAberto(false);
                    }}
                    className="text-liv-faint hover:text-liv-muted transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-liv-muted mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>

                {/* Forma Pagamento + Distribuidora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                    >
                      <option value="">Selecione...</option>
                      <option value="SANTANDER">Santander</option>
                      <option value="BV">BV</option>
                      <option value="SOLFACIL">Solfacil</option>
                      <option value="SOL_AGORA">Sol Agora</option>
                      <option value="TVIN">TVIN</option>
                      <option value="A_VISTA">A Vista</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      Distribuidora
                    </label>
                    <select
                      value={distribuidora}
                      onChange={(e) => setDistribuidora(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                    >
                      <option value="">Selecione...</option>
                      <option value="BELENERGY">Belenergy</option>
                      <option value="SOLFACIL">Solfacil</option>
                      <option value="BLUESUN">Bluesun</option>
                      <option value="SOL_AGORA">Sol Agora</option>
                      <option value="TVIN">TVIN</option>
                    </select>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      Valor da Venda (R$) *
                    </label>
                    <CurrencyInput
                      value={valorVendaDisplay}
                      onValueChange={handleValorVenda}
                      placeholder="Ex: 12.890,00"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      Custo Equipamentos (R$) *
                    </label>
                    <CurrencyInput
                      value={custoEquipDisplay}
                      onValueChange={handleCustoEquip}
                      placeholder="Ex: 6.043,00"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      kWp
                    </label>
                    <CurrencyInput
                      value={kwpDisplay}
                      onValueChange={handleKwp}
                      placeholder="Ex: 5,40"
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      Qtd. Placas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantidadePlacas}
                      onChange={(e) => setQuantidadePlacas(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                      placeholder="Ex: 8"
                      required
                    />
                  </div>
                </div>

                {/* Origem da venda (apenas vendedor hibrido) */}
                {isHibrido && (
                  <div className="rounded-lg border border-liv-sage/40 bg-liv-surface-2 p-3">
                    <label className="block text-xs font-medium text-liv-muted mb-2">
                      Origem da venda <span className="text-liv-sage">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoVenda("INBOUND")}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                          tipoVenda === "INBOUND"
                            ? "border-liv-sage bg-liv-sage/15 text-liv-sage"
                            : "border-liv-line bg-transparent text-liv-muted hover:text-liv-ink"
                        }`}
                      >
                        Inbound
                        <span className="block text-[10px] font-normal text-liv-faint mt-0.5">
                          Lead da empresa · over progressivo
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoVenda("EXTERNA")}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                          tipoVenda === "EXTERNA"
                            ? "border-liv-sage bg-liv-sage/15 text-liv-sage"
                            : "border-liv-line bg-transparent text-liv-muted hover:text-liv-ink"
                        }`}
                      >
                        Externa
                        <span className="block text-[10px] font-normal text-liv-faint mt-0.5">
                          Captação própria · over 50% flat
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Status do contrato */}
                <div className="rounded-lg border border-liv-line bg-liv-surface-2 p-3">
                  <label className="block text-xs font-medium text-liv-muted mb-2">
                    Status do contrato <span className="text-liv-sage">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusContrato("COMPLETO")}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition border text-left ${
                        statusContrato === "COMPLETO"
                          ? "border-liv-sage bg-liv-sage/15 text-liv-sage"
                          : "border-liv-line bg-transparent text-liv-muted hover:text-liv-ink"
                      }`}
                    >
                      Fechado por completo
                      <span className="block text-[10px] font-normal text-liv-faint mt-0.5">
                        Empresa + banco aprovado
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusContrato("A_FINALIZAR")}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition border text-left ${
                        statusContrato === "A_FINALIZAR"
                          ? "border-liv-gold bg-liv-gold/15 text-liv-gold"
                          : "border-liv-line bg-transparent text-liv-muted hover:text-liv-ink"
                      }`}
                    >
                      A finalizar
                      <span className="block text-[10px] font-normal text-liv-faint mt-0.5">
                        Só assinou com a empresa
                      </span>
                    </button>
                  </div>
                </div>

                {/* Data + Fonte */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-liv-muted mb-1">
                      Data de Conversao *
                    </label>
                    <input
                      type="date"
                      value={dataConversao}
                      onChange={(e) => setDataConversao(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                      required
                    />
                  </div>
                  {isHibrido && tipoVenda === "EXTERNA" ? (
                    <div>
                      <label className="block text-sm font-medium text-liv-muted mb-1">
                        Fonte do Lead
                      </label>
                      <div className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2/60 text-liv-faint text-sm">
                        Captação externa (preenchido automatico)
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-liv-muted mb-1">
                        Fonte do Lead {isHibrido && <span className="text-liv-sage">*</span>}
                      </label>
                      <select
                        value={fonte}
                        onChange={(e) => setFonte(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none bg-liv-surface-2 text-liv-ink"
                      >
                        <option value="">Selecione...</option>
                        <option value="TRAFEGO">Trafego</option>
                        <option value="INDICACAO">Indicacao</option>
                        <option value="FOLLOWUP">Followup (lead do trafego, sem SDR)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Alerta de Margem inline */}
                {alertaMargem && (
                  <div className="bg-liv-gold/10 border border-liv-gold/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-liv-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-liv-gold">Margem abaixo de 1.8x</p>
                      <p className="text-sm text-liv-gold mt-1">
                        Esta venda esta com margem de <span className="tabular-nums">{formatNumber(margem)}x</span>. Voce nao recebera
                        comissao sobre o <strong>over</strong> desta venda. A comissao de 2,5% sobre a venda continua valida.
                      </p>
                    </div>
                  </div>
                )}

                {/* Erros e Sucesso */}
                {formErro && (
                  <div className="bg-liv-danger/10 text-liv-danger px-4 py-3 rounded-lg text-sm">
                    {formErro}
                  </div>
                )}
                {formSucesso && (
                  <div className="bg-liv-sage/10 text-liv-sage px-4 py-3 rounded-lg text-sm">
                    Venda registrada com sucesso!
                  </div>
                )}

                {/* Botao Salvar */}
                <button
                  type="submit"
                  disabled={formLoading || formSucesso}
                  className="w-full bg-liv-sage text-liv-bg py-3 rounded-lg font-semibold hover:bg-liv-sage-deep transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-liv-bg"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Venda
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Painel de Calculos em Tempo Real */}
            <div className="lg:col-span-1">
              <div className="bg-liv-surface rounded-xl p-6 shadow-sm border border-liv-line">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-liv-sage" />
                  <h3 className="font-semibold text-liv-ink">Calculo em Tempo Real</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-liv-line">
                    <span className="text-sm text-liv-muted">Margem</span>
                    <span className={`font-semibold tabular-nums ${alertaMargem ? "text-liv-danger" : "text-liv-sage"}`}>
                      {margem > 0 ? `${formatNumber(margem)}x` : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-liv-line">
                    <span className="text-sm text-liv-muted">Over</span>
                    <span className={`font-semibold tabular-nums ${over > 0 ? "text-liv-sage" : "text-liv-faint"}`}>
                      {formatCurrency(over)}
                      {alertaMargem && <span className="text-xs text-liv-danger ml-1">(sem over)</span>}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-liv-line">
                    <span className="text-sm text-liv-muted">Geracao kWh</span>
                    <span className="font-semibold text-liv-ink tabular-nums">
                      {geracaoKwh > 0 ? `${formatNumber(geracaoKwh, 0)} kWh` : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-liv-line">
                    <span className="text-sm text-liv-muted">Comissao Venda (2,5%)</span>
                    <span className="font-semibold text-liv-sage tabular-nums">
                      {formatCurrency(comissaoVenda)}
                    </span>
                  </div>

                  {over > 0 && (
                    <div className="flex justify-between py-2 border-b border-liv-line">
                      <span className="text-sm text-liv-muted">Comissao Over*</span>
                      <span className="font-semibold text-liv-sage tabular-nums">
                        {formatCurrency(over * 0.35)}
                        <span className="text-xs text-liv-faint ml-1">(35%)</span>
                      </span>
                    </div>
                  )}

                  <div className="bg-liv-sage/10 rounded-lg p-4 mt-4">
                    <p className="text-xs text-liv-sage font-medium uppercase tracking-wider">
                      Comissao Estimada
                    </p>
                    <p className="text-2xl font-bold text-liv-sage mt-1 tabular-nums">
                      {formatCurrency(comissaoVenda + (over > 0 ? over * 0.35 : 0))}
                    </p>
                    <p className="text-xs text-liv-sage mt-1 tabular-nums">
                      {over > 0
                        ? `${formatCurrency(comissaoVenda)} (venda) + ${formatCurrency(over * 0.35)} (over)`
                        : `2,5% sobre ${formatCurrency(valor)}`
                      }
                    </p>
                    {over > 0 && (
                      <p className="text-xs text-liv-faint mt-1">
                        * % over pode variar conforme faixa mensal
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>}

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-liv-surface rounded-xl p-5 shadow-sm border border-liv-line">
          <p className="text-sm text-liv-muted">Total Vendido</p>
          <p className="text-xl font-bold text-liv-ink mt-1 tabular-nums">{formatCurrency(totalVendido)}</p>
        </div>
        <div className="bg-liv-surface rounded-xl p-5 shadow-sm border border-liv-line">
          <p className="text-sm text-liv-muted">Quantidade</p>
          <p className="text-xl font-bold text-liv-ink mt-1">{vendas.length} vendas</p>
        </div>
        <div className="bg-liv-surface rounded-xl p-5 shadow-sm border border-liv-line">
          <p className="text-sm text-liv-muted">Comissao Total</p>
          <p className="text-xl font-bold text-liv-sage mt-1 tabular-nums">{formatCurrency(totalComissao)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage"></div>
        </div>
      ) : vendas.length === 0 ? (
        <div className="bg-liv-surface rounded-xl p-12 shadow-sm border border-liv-line text-center">
          <ShoppingCart className="w-12 h-12 text-liv-faint mx-auto mb-4" />
          <h3 className="text-lg font-medium text-liv-ink mb-2">Nenhuma venda neste mes</h3>
          {!admin && (
            <button
              onClick={() => setFormAberto(true)}
              className="inline-flex items-center gap-2 bg-liv-sage text-liv-bg px-6 py-3 rounded-lg font-medium hover:bg-liv-sage-deep transition"
            >
              <Plus className="w-4 h-4" />
              Registrar Venda
            </button>
          )}
          {admin && <p className="text-liv-muted">Aguardando registro de vendas pelos vendedores.</p>}
        </div>
      ) : (
        <div className="bg-liv-surface rounded-xl shadow-sm border border-liv-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-liv-surface-2 text-liv-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  {admin && <th className="text-left px-4 py-3 font-medium">Vendedor</th>}
                  <th className="text-left px-4 py-3 font-medium">Distribuidora</th>
                  <th className="text-right px-4 py-3 font-medium">Valor</th>
                  <th className="text-right px-4 py-3 font-medium">Equip.</th>
                  <th className="text-right px-4 py-3 font-medium">kWp</th>
                  <th className="text-right px-4 py-3 font-medium">Margem</th>
                  <th className="text-right px-4 py-3 font-medium">Over</th>
                  <th className="text-right px-4 py-3 font-medium">Com. Venda</th>
                  <th className="text-right px-4 py-3 font-medium">Com. Over</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Fonte</th>
                  <th className="text-center px-4 py-3 font-medium">Data</th>
                  <th className="text-center px-4 py-3 font-medium">Contrato</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {vendas.map((v) => (
                  <tr key={v.id} className="hover:bg-liv-surface-2">
                    <td className="px-4 py-3 font-medium text-liv-ink">{v.cliente}</td>
                    {admin && <td className="px-4 py-3 text-liv-muted">{v.vendedor?.nome || "-"}</td>}
                    <td className="px-4 py-3 text-liv-muted">{v.distribuidora}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(v.valorVenda)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(v.custoEquipamentos)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(v.kwp)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums ${v.margem < 1.8 ? "text-liv-danger font-medium" : "text-liv-sage"}`}>
                        {formatNumber(v.margem)}x
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(v.over)}</td>
                    <td className="px-4 py-3 text-right text-liv-muted tabular-nums">
                      {formatCurrency(v.comissaoVenda)}
                    </td>
                    <td className="px-4 py-3 text-right text-liv-gold tabular-nums">
                      {formatCurrency(v.comissaoOver)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-liv-sage tabular-nums">
                      {formatCurrency(v.comissaoTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-liv-surface-2 text-liv-muted">
                        {v.fonte}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-liv-muted">
                      {new Date(v.dataConversao).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleStatusContrato(v)}
                        title="Clique para alternar o status do contrato"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                          v.statusContrato === "A_FINALIZAR"
                            ? "bg-liv-gold/10 text-liv-gold hover:bg-liv-gold/20"
                            : "bg-liv-sage/10 text-liv-sage hover:bg-liv-sage/20"
                        }`}
                      >
                        {v.statusContrato === "A_FINALIZAR" ? (
                          <>
                            <Clock className="w-3 h-3" />
                            A finalizar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Fechado
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1">
                      {admin && (
                        <button
                          onClick={() => {
                            setVendaEditando({
                              id: v.id,
                              cliente: v.cliente,
                              vendedor: v.vendedor?.nome,
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
                              dataConversao: v.dataConversao,
                              comissaoVenda: v.comissaoVenda,
                              comissaoOver: v.comissaoOver,
                              comissaoTotal: v.comissaoTotal,
                              over: v.over,
                              vendedorId: v.vendedorId,
                              mesReferencia: v.mesReferencia,
                              excecao: v.excecao,
                              historicoAlteracoes: v.historicoAlteracoes,
                              // Campos basicos editaveis
                              fonte: v.fonte,
                              tipoVenda: v.tipoVenda,
                              distribuidora: v.distribuidora,
                              formaPagamento: v.formaPagamento,
                              kwp: v.kwp,
                            });
                            setEditPanelOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-liv-gold/10 text-liv-faint hover:text-liv-gold transition"
                          title="Editar custos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => excluirVenda(v.id)}
                        className="text-liv-danger hover:text-liv-danger transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-liv-sage/10 font-semibold text-liv-sage">
                <tr>
                  {/* Cliente + Vendedor (admin) + Distribuidora */}
                  <td className="px-4 py-3" colSpan={admin ? 3 : 2}>TOTAIS</td>
                  {/* Valor */}
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalVendido)}</td>
                  {/* Equip. */}
                  <td className="px-4 py-3 text-right text-liv-muted tabular-nums">{formatCurrency(totalEquipamentos)}</td>
                  {/* kWp */}
                  <td className="px-4 py-3"></td>
                  {/* Margem (media ponderada) */}
                  <td className="px-4 py-3 text-right text-liv-muted tabular-nums">{margemMedia.toFixed(2)}x</td>
                  {/* Over */}
                  <td className="px-4 py-3 text-right text-liv-muted tabular-nums">{formatCurrency(totalOver)}</td>
                  {/* Com. Venda */}
                  <td className="px-4 py-3 text-right text-liv-muted tabular-nums">{formatCurrency(totalComissaoVenda)}</td>
                  {/* Com. Over */}
                  <td className="px-4 py-3 text-right text-liv-gold tabular-nums">{formatCurrency(totalComissaoOver)}</td>
                  {/* Total */}
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalComissao)}</td>
                  {/* Fonte + Data + Contrato + acoes */}
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      </>}

      {/* Panel de Edicao de Venda (admin) */}
      {admin && (
        <EditVendaPanel
          venda={vendaEditando}
          isOpen={editPanelOpen}
          onClose={() => {
            setEditPanelOpen(false);
            setVendaEditando(null);
          }}
          onSaved={fetchVendas}
        />
      )}
    </div>
  );
}

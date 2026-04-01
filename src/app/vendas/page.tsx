"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { isAdmin as checkAdmin } from "@/lib/roles";
import CurrencyInput from "@/components/CurrencyInput";
import { EditVendaPanel, VendaEditavel } from "@/components/EditVendaPanel";
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
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

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
}

export default function VendasPage() {
  const { data: session } = useSession();
  const admin = checkAdmin(session?.user?.role);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendaEditando, setVendaEditando] = useState<VendaEditavel | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"vendas" | "extrato">("vendas");
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

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

  const resetForm = () => {
    setCliente("");
    setFormaPagamento("");
    setDistribuidora("");
    setDataConversao(new Date().toISOString().split("T")[0]);
    setFonte("");
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
          fonte,
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
            .filter((v: any) => v.ativo && (v.role === "VENDEDOR" || v.role === "ADMIN" || v.role === "DIRETOR"))
            .map((v: any) => ({ id: v.id, nome: v.nome, role: v.role }));
          setVendedores(vendedoresAtivos);
        })
        .catch(console.error);
    }
  }, [admin]);

  // --- Lista de Vendas ---
  useEffect(() => {
    fetchVendas();
  }, [mesAtual, vendedorFiltro]);

  const fetchVendas = async () => {
    setLoading(true);
    try {
      let url = `/api/vendas?mes=${mesAtual}`;
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

  const totalVendido = vendas.reduce((sum, v) => sum + v.valorVenda, 0);
  const totalComissaoVenda = vendas.reduce((sum, v) => sum + v.comissaoVenda, 0);
  const totalComissaoOver = vendas.reduce((sum, v) => sum + v.comissaoOver, 0);
  const totalComissao = vendas.reduce((sum, v) => sum + v.comissaoTotal, 0);

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  return (
    <div className="space-y-6">
      {/* MODAL DE CONFIRMACAO - MARGEM BAIXA */}
      {showModalMargem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1f2e] rounded-2xl max-w-md w-full shadow-lg">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-6 border-b border-[#232a3b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400/10 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-lg text-gray-100">Margem Abaixo de 1.8x</h3>
              </div>
              <button
                onClick={() => setShowModalMargem(false)}
                className="text-gray-500 hover:text-gray-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-amber-400">Cliente</span>
                  <span className="font-medium text-amber-400">{cliente}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-amber-400">Valor da Venda</span>
                  <span className="font-medium text-amber-400">{formatCurrency(valor)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-400">Margem</span>
                  <span className="font-bold text-red-400">{formatNumber(margem)}x</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Esta venda esta com margem de <strong className="text-red-400">{formatNumber(margem)}x</strong>, abaixo do minimo de <strong>1.8x</strong>.
                </p>
                <p className="text-sm text-gray-300">
                  Voce <strong>nao recebera comissao sobre o over</strong> desta venda, apenas a comissao de 2,5% ({formatCurrency(comissaoVenda)}).
                </p>
                <p className="text-sm font-medium text-amber-400 mt-3">
                  Voce confirmou esta margem com seu supervisor?
                </p>
              </div>
            </div>

            {/* Botoes do modal */}
            <div className="p-6 border-t border-[#232a3b] flex gap-3">
              <button
                onClick={() => setShowModalMargem(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarVenda}
                disabled={formLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {admin ? "Todas as Vendas" : "Minhas Vendas"}
            </h1>
            <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
          </div>
          {!admin && <NotificationBell />}
        </div>
        <div className="flex gap-3 flex-wrap">
          {admin && vendedores.length > 0 && (
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
            >
              <option value="">Todos os vendedores</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          )}
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
          />
          {!admin && (
            <button
              onClick={() => {
                if (formAberto) {
                  resetForm();
                }
                setFormAberto(!formAberto);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                formAberto
                  ? "bg-[#232a3b] text-gray-300 hover:bg-[#2a3142]"
                  : "bg-lime-400 text-gray-900 hover:bg-lime-500"
              }`}
            >
              <Plus
                className={`w-4 h-4 transition-transform duration-300 ${
                  formAberto ? "rotate-45" : ""
                }`}
              />
              Nova Venda
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!admin && (
        <div className="flex gap-1 bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-1 w-fit">
          <button
            onClick={() => setAbaAtiva("vendas")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "vendas"
                ? "bg-lime-400 text-gray-900"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Minhas Vendas
          </button>
          <button
            onClick={() => setAbaAtiva("extrato")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "extrato"
                ? "bg-lime-400 text-gray-900"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Extrato de Comissões
          </button>
        </div>
      )}

      {/* ── ABA: EXTRATO DE COMISSÕES ── */}
      {!admin && abaAtiva === "extrato" && (() => {
        const recebido = vendas.filter(v => v.status === "PAGO").reduce((s, v) => s + v.comissaoTotal, 0);
        const pendente = vendas.filter(v => v.status !== "PAGO").reduce((s, v) => s + v.comissaoTotal, 0);
        return (
          <div className="space-y-4">
            {/* Cards resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]">
                <p className="text-sm text-gray-400">Total do mês</p>
                <p className="text-xl font-bold text-lime-400 mt-1">{formatCurrency(totalComissao)}</p>
                <p className="text-xs text-gray-500 mt-1">{vendas.length} vendas</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]">
                <p className="text-sm text-gray-400">Recebido</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(recebido)}</p>
                <p className="text-xs text-gray-500 mt-1">{vendas.filter(v => v.status === "PAGO").length} vendas pagas</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]">
                <p className="text-sm text-gray-400">Pendente</p>
                <p className="text-xl font-bold text-yellow-400 mt-1">{formatCurrency(pendente)}</p>
                <p className="text-xs text-gray-500 mt-1">{vendas.filter(v => v.status !== "PAGO").length} vendas aguardando</p>
              </div>
            </div>

            {/* Tabela extrato */}
            {vendas.length === 0 ? (
              <div className="bg-[#1a1f2e] rounded-xl p-12 border border-[#232a3b] text-center">
                <p className="text-gray-400">Nenhuma venda neste mês.</p>
              </div>
            ) : (
              <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#141820] text-gray-400">
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
                    <tbody className="divide-y divide-[#232a3b]">
                      {vendas.map((v) => (
                        <tr key={v.id} className="hover:bg-[#232a3b]">
                          <td className="px-4 py-3 font-medium text-gray-100">{v.cliente}</td>
                          <td className="px-4 py-3 text-center text-gray-400">
                            {new Date(v.dataConversao).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(v.valorVenda)}</td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {formatCurrency(v.comissaoVenda)}
                            {v.comissaoVendaPaga && (
                              <span className="ml-1 text-xs text-emerald-400">✓</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-yellow-400">
                            {formatCurrency(v.comissaoOver)}
                            {v.comissaoOverPaga && (
                              <span className="ml-1 text-xs text-emerald-400">✓</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-lime-400">
                            {formatCurrency(v.comissaoTotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.status === "PAGO" ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400">Recebido</span>
                            ) : v.comissaoVendaPaga || v.comissaoOverPaga ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">Parcial</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400">Pendente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-lime-400/10 font-semibold">
                      <tr>
                        <td className="px-4 py-3 text-lime-400" colSpan={3}>TOTAIS DO MÊS</td>
                        <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(totalComissaoVenda)}</td>
                        <td className="px-4 py-3 text-right text-yellow-400">{formatCurrency(totalComissaoOver)}</td>
                        <td className="px-4 py-3 text-right text-lime-400">{formatCurrency(totalComissao)}</td>
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
              <form onSubmit={handleFormSubmit} className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] space-y-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-gray-100">Registrar Nova Venda</h2>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setFormAberto(false);
                    }}
                    className="text-gray-500 hover:text-gray-400 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>

                {/* Forma Pagamento + Distribuidora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    >
                      <option value="">Selecione...</option>
                      <option value="SANTANDER">Santander</option>
                      <option value="BV">BV</option>
                      <option value="SOLFACIL">Solfacil</option>
                      <option value="A_VISTA">A Vista</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Distribuidora
                    </label>
                    <select
                      value={distribuidora}
                      onChange={(e) => setDistribuidora(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    >
                      <option value="">Selecione...</option>
                      <option value="BELENERGY">Belenergy</option>
                      <option value="SOLFACIL">Solfacil</option>
                      <option value="BLUESUN">Bluesun</option>
                    </select>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Valor da Venda (R$) *
                    </label>
                    <CurrencyInput
                      value={valorVendaDisplay}
                      onValueChange={handleValorVenda}
                      placeholder="Ex: 12.890,00"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Custo Equipamentos (R$) *
                    </label>
                    <CurrencyInput
                      value={custoEquipDisplay}
                      onValueChange={handleCustoEquip}
                      placeholder="Ex: 6.043,00"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      kWp
                    </label>
                    <CurrencyInput
                      value={kwpDisplay}
                      onValueChange={handleKwp}
                      placeholder="Ex: 5,40"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Qtd. Placas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantidadePlacas}
                      onChange={(e) => setQuantidadePlacas(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                      placeholder="Ex: 8"
                      required
                    />
                  </div>
                </div>

                {/* Data + Fonte */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Data de Conversao *
                    </label>
                    <input
                      type="date"
                      value={dataConversao}
                      onChange={(e) => setDataConversao(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Fonte do Lead
                    </label>
                    <select
                      value={fonte}
                      onChange={(e) => setFonte(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                    >
                      <option value="">Selecione...</option>
                      <option value="TRAFEGO">Trafego</option>
                      <option value="INDICACAO">Indicacao</option>
                    </select>
                  </div>
                </div>

                {/* Alerta de Margem inline */}
                {alertaMargem && (
                  <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-400">Margem abaixo de 1.8x</p>
                      <p className="text-sm text-amber-400 mt-1">
                        Esta venda esta com margem de {formatNumber(margem)}x. Voce nao recebera
                        comissao sobre o <strong>over</strong> desta venda. A comissao de 2,5% sobre a venda continua valida.
                      </p>
                    </div>
                  </div>
                )}

                {/* Erros e Sucesso */}
                {formErro && (
                  <div className="bg-red-400/10 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {formErro}
                  </div>
                )}
                {formSucesso && (
                  <div className="bg-lime-400/10 text-lime-400 px-4 py-3 rounded-lg text-sm">
                    Venda registrada com sucesso!
                  </div>
                )}

                {/* Botao Salvar */}
                <button
                  type="submit"
                  disabled={formLoading || formSucesso}
                  className="w-full bg-lime-400 text-gray-900 py-3 rounded-lg font-semibold hover:bg-lime-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
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
              <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-lime-400" />
                  <h3 className="font-semibold text-gray-100">Calculo em Tempo Real</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-[#232a3b]">
                    <span className="text-sm text-gray-400">Margem</span>
                    <span className={`font-semibold ${alertaMargem ? "text-red-400" : "text-lime-400"}`}>
                      {margem > 0 ? `${formatNumber(margem)}x` : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#232a3b]">
                    <span className="text-sm text-gray-400">Over</span>
                    <span className={`font-semibold ${over > 0 ? "text-lime-400" : "text-gray-500"}`}>
                      {formatCurrency(over)}
                      {alertaMargem && <span className="text-xs text-red-400 ml-1">(sem over)</span>}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#232a3b]">
                    <span className="text-sm text-gray-400">Geracao kWh</span>
                    <span className="font-semibold text-gray-100">
                      {geracaoKwh > 0 ? `${formatNumber(geracaoKwh, 0)} kWh` : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#232a3b]">
                    <span className="text-sm text-gray-400">Comissao Venda (2,5%)</span>
                    <span className="font-semibold text-lime-400">
                      {formatCurrency(comissaoVenda)}
                    </span>
                  </div>

                  {over > 0 && (
                    <div className="flex justify-between py-2 border-b border-[#232a3b]">
                      <span className="text-sm text-gray-400">Comissao Over*</span>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(over * 0.35)}
                        <span className="text-xs text-gray-500 ml-1">(35%)</span>
                      </span>
                    </div>
                  )}

                  <div className="bg-lime-400/10 rounded-lg p-4 mt-4">
                    <p className="text-xs text-lime-400 font-medium uppercase tracking-wider">
                      Comissao Estimada
                    </p>
                    <p className="text-2xl font-bold text-lime-400 mt-1">
                      {formatCurrency(comissaoVenda + (over > 0 ? over * 0.35 : 0))}
                    </p>
                    <p className="text-xs text-lime-400 mt-1">
                      {over > 0
                        ? `${formatCurrency(comissaoVenda)} (venda) + ${formatCurrency(over * 0.35)} (over)`
                        : `2,5% sobre ${formatCurrency(valor)}`
                      }
                    </p>
                    {over > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
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
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <p className="text-sm text-gray-400">Total Vendido</p>
          <p className="text-xl font-bold text-gray-100 mt-1">{formatCurrency(totalVendido)}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <p className="text-sm text-gray-400">Quantidade</p>
          <p className="text-xl font-bold text-gray-100 mt-1">{vendas.length} vendas</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <p className="text-sm text-gray-400">Comissao Total</p>
          <p className="text-xl font-bold text-lime-400 mt-1">{formatCurrency(totalComissao)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
        </div>
      ) : vendas.length === 0 ? (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhuma venda neste mes</h3>
          {!admin && (
            <button
              onClick={() => setFormAberto(true)}
              className="inline-flex items-center gap-2 bg-lime-400 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-lime-500 transition"
            >
              <Plus className="w-4 h-4" />
              Registrar Venda
            </button>
          )}
          {admin && <p className="text-gray-400">Aguardando registro de vendas pelos vendedores.</p>}
        </div>
      ) : (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820] text-gray-400">
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3b]">
                {vendas.map((v) => (
                  <tr key={v.id} className="hover:bg-[#232a3b]">
                    <td className="px-4 py-3 font-medium text-gray-100">{v.cliente}</td>
                    {admin && <td className="px-4 py-3 text-gray-400">{v.vendedor?.nome || "-"}</td>}
                    <td className="px-4 py-3 text-gray-400">{v.distribuidora}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(v.valorVenda)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(v.custoEquipamentos)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(v.kwp)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={v.margem < 1.8 ? "text-red-400 font-medium" : "text-lime-400"}>
                        {formatNumber(v.margem)}x
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(v.over)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatCurrency(v.comissaoVenda)}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-400">
                      {formatCurrency(v.comissaoOver)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-lime-400">
                      {formatCurrency(v.comissaoTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#1a1f2e] text-gray-400">
                        {v.fonte}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {new Date(v.dataConversao).toLocaleDateString("pt-BR")}
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
                            });
                            setEditPanelOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-400/10 text-gray-500 hover:text-amber-400 transition"
                          title="Editar custos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => excluirVenda(v.id)}
                        className="text-red-400 hover:text-red-300 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-lime-400/10 font-semibold text-lime-400">
                <tr>
                  <td className="px-4 py-3" colSpan={admin ? 3 : 2}>TOTAIS</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalVendido)}</td>
                  <td className="px-4 py-3" colSpan={2}></td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(totalComissaoVenda)}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{formatCurrency(totalComissaoOver)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalComissao)}</td>
                  <td colSpan={3}></td>
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

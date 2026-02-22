"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { EditVendaPanel, VendaEditavel } from "@/components/EditVendaPanel";

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
  custoImposto: number;
  comissaoVendedor: number;
  lucroLiquido: number;
  margemLucroLiquido: number;
  margem: number;
  status: string;
  dataConversao: string;
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
    custoImpostoTotal: number;
    comissaoVendedorTotal: number;
    custoTotalOperacional: number;
    lucroLiquidoTotal: number;
    margemLucroMedia: number;
    quantidadeVendas: number;
    ticketMedio: number;
    alertaMargemLucro: boolean;
    mensagemAlertaLucro: string | null;
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

  useEffect(() => {
    fetchDados();
  }, [mesAtual]);

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
    if (margem >= 0.20 && margem <= 0.25) return "text-lime-400";
    if (margem < 0.20) return "text-red-400";
    return "text-amber-400";
  };

  const getMargemBg = (margem: number) => {
    if (margem >= 0.20 && margem <= 0.25) return "bg-lime-400/10 ring-lime-400/20";
    if (margem < 0.20) return "bg-red-400/10 ring-red-200";
    return "bg-amber-400/10 ring-amber-400/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  const r = dados?.resumo;
  const c = dados?.comparacao;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Painel Financeiro</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
        />
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-400/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-gray-400">Faturamento</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {formatCurrency(r?.faturamentoTotal || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {(c?.variacaoFaturamento ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3 text-green-500" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${(c?.variacaoFaturamento ?? 0) >= 0 ? "text-lime-400" : "text-red-400"}`}>
              {Math.abs(c?.variacaoFaturamento ?? 0).toFixed(1)}% vs mes anterior
            </span>
          </div>
        </div>

        {/* Custo Total */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-400/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm text-gray-400">Custo Total</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {formatCurrency(r?.custoTotalOperacional || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {r?.quantidadeVendas || 0} vendas | Ticket medio {formatCurrency(r?.ticketMedio || 0)}
          </p>
        </div>

        {/* Lucro Liquido */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-lime-400/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-lime-400" />
            </div>
            <span className="text-sm text-gray-400">Lucro Liquido</span>
          </div>
          <p className={`text-2xl font-bold ${(r?.lucroLiquidoTotal ?? 0) >= 0 ? "text-lime-400" : "text-red-400"}`}>
            {formatCurrency(r?.lucroLiquidoTotal || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {(c?.variacaoLucro ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3 text-green-500" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${(c?.variacaoLucro ?? 0) >= 0 ? "text-lime-400" : "text-red-400"}`}>
              {Math.abs(c?.variacaoLucro ?? 0).toFixed(1)}% vs mes anterior
            </span>
          </div>
        </div>

        {/* Margem de Lucro */}
        <div className={`bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] ring-2 ${getMargemBg(r?.margemLucroMedia || 0)}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-400/10 rounded-lg flex items-center justify-center">
              <Percent className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-gray-300">Margem Lucro</span>
          </div>
          <p className={`text-2xl font-bold ${getMargemColor(r?.margemLucroMedia || 0)}`}>
            {((r?.margemLucroMedia || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Meta: 20% - 25%</p>
        </div>
      </div>

      {/* Alerta de Margem */}
      {r?.alertaMargemLucro && r?.mensagemAlertaLucro && (
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-400">Alerta de Margem</h3>
          </div>
          <p className="text-sm text-amber-400">{r.mensagemAlertaLucro}</p>
        </div>
      )}

      {/* Detalhamento de Custos */}
      <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
        <h2 className="font-semibold text-gray-100 mb-4">Detalhamento de Custos do Mes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Equipamentos</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoEquipamentosTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Instalacao</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoInstalacaoTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Impostos (6%)</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoImpostoTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Comissoes</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.comissaoVendedorTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Visita Tecnica</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoVisitaTecnicaTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">COSERN</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoCosernTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">TRT/CREA</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoTrtCreaTotal || 0)}</p>
          </div>
          <div className="bg-[#141820] rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Engenheiro</p>
            <p className="text-lg font-bold text-gray-100 mt-1">{formatCurrency(r?.custoEngenheiroTotal || 0)}</p>
          </div>
          <div className="bg-amber-400/10 rounded-lg p-4 ring-1 ring-amber-400/20">
            <p className="text-xs text-amber-400 uppercase tracking-wider font-medium">Total Custos</p>
            <p className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(r?.custoTotalOperacional || 0)}</p>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas Detalhada */}
      {dados?.vendas && dados.vendas.length > 0 && (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#232a3b]">
            <h2 className="font-semibold text-gray-100">Vendas do Mes - Visao Completa</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820] text-gray-400">
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
              <tbody className="divide-y divide-[#232a3b]">
                {dados.vendas.map((v) => {
                  const outrosCustos = v.custoVisitaTecnica + v.custoCosern + v.custoTrtCrea + (v.custoEngenheiro || 0);
                  return (
                    <tr
                      key={v.id}
                      className={
                        v.margemLucroLiquido < 0.20
                          ? "bg-red-400/5 hover:bg-red-400/10"
                          : v.margemLucroLiquido >= 0.20 && v.margemLucroLiquido <= 0.25
                          ? "hover:bg-lime-400/5"
                          : "hover:bg-[#232a3b]"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-gray-100 whitespace-nowrap">{v.cliente}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{v.vendedor}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(v.valorVenda)}</td>
                      <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">{formatCurrency(v.custoEquipamentos)}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{v.quantidadePlacas}</td>
                      <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">{formatCurrency(v.custoInstalacao)}</td>
                      <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">{formatCurrency(v.custoImposto)}</td>
                      <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">{formatCurrency(v.comissaoVendedor)}</td>
                      <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">{formatCurrency(outrosCustos)}</td>
                      <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${v.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
                        {formatCurrency(v.lucroLiquido)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                          v.margemLucroLiquido >= 0.20 && v.margemLucroLiquido <= 0.25
                            ? "bg-lime-400/15 text-lime-400"
                            : v.margemLucroLiquido < 0.20
                            ? "bg-red-400/10 text-red-400"
                            : "bg-amber-400/10 text-amber-400"
                        }`}>
                          {(v.margemLucroLiquido * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setVendaEditando({
                              id: v.id,
                              cliente: v.cliente,
                              vendedor: v.vendedor,
                              valorVenda: v.valorVenda,
                              custoEquipamentos: v.custoEquipamentos,
                              quantidadePlacas: v.quantidadePlacas,
                              quantidadeInversores: v.quantidadeInversores,
                              custoInstalacao: v.custoInstalacao,
                              custoVisitaTecnica: v.custoVisitaTecnica,
                              custoCosern: v.custoCosern,
                              custoTrtCrea: v.custoTrtCrea,
                              custoEngenheiro: v.custoEngenheiro,
                              custoImposto: v.custoImposto,
                              comissaoVendedor: v.comissaoVendedor,
                              lucroLiquido: v.lucroLiquido,
                              margemLucroLiquido: v.margemLucroLiquido,
                            });
                            setEditPanelOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-400/10 text-gray-500 hover:text-amber-400 transition"
                          title="Editar custos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totais */}
              <tfoot className="bg-[#141820] font-medium">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-100" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(r?.faturamentoTotal || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r?.custoEquipamentosTotal || 0)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r?.custoInstalacaoTotal || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r?.custoImpostoTotal || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r?.comissaoVendedorTotal || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency((r?.custoVisitaTecnicaTotal || 0) + (r?.custoCosernTotal || 0) + (r?.custoTrtCreaTotal || 0) + (r?.custoEngenheiroTotal || 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-lime-400">{formatCurrency(r?.lucroLiquidoTotal || 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-bold ${
                      (r?.margemLucroMedia || 0) >= 0.20 && (r?.margemLucroMedia || 0) <= 0.25
                        ? "bg-lime-400/15 text-lime-400"
                        : "bg-red-400/10 text-red-400"
                    }`}>
                      {((r?.margemLucroMedia || 0) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Sem vendas */}
      {(!dados?.vendas || dados.vendas.length === 0) && (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhuma venda este mes</h3>
          <p className="text-gray-400">Aguardando registro de vendas pelos vendedores.</p>
        </div>
      )}

      {/* Panel de Edicao de Venda */}
      <EditVendaPanel
        venda={vendaEditando}
        isOpen={editPanelOpen}
        onClose={() => {
          setEditPanelOpen(false);
          setVendaEditando(null);
        }}
        onSaved={fetchDados}
      />
    </div>
  );
}

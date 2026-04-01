"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Zap, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface VendaComissao {
  id: string;
  cliente: string;
  valorVenda: number;
  comissaoVenda: number;
  comissaoOver: number;
  comissaoTotal: number;
  dataConversao: string;
  comissaoVendaPaga: boolean;
  comissaoOverPaga: boolean;
}

interface ComissaoData {
  mes: string;
  totalVendido: number;
  quantidadeVendas: number;
  comissaoVendaTotal: number;
  comissaoOverTotal: number;
  comissaoTotal: number;
  faixaAtual: string;
  detalhamentoFaixas: {
    faixa: string;
    volumeNaFaixa: number;
    percentualOver: number;
    comissaoOverFaixa: number;
  }[];
  alertas: string[];
  vendas: VendaComissao[];
}

export default function ComissoesPage() {
  const [dados, setDados] = useState<ComissaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagamentosAberto, setPagamentosAberto] = useState(false);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchDados();
  }, [mesAtual]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comissoes?mes=${mesAtual}`);
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error("Erro:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Minhas Comissoes</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {/* Card Principal */}
      <div className="bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-2xl p-8 border border-lime-400/20">
        <p className="text-lime-300 text-sm font-medium">Comissao Total do Mes</p>
        <p className="text-4xl font-bold mt-2 text-gray-100">
          {formatCurrency(dados?.comissaoTotal || 0)}
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-lime-300/70 text-xs">Total Vendido</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.totalVendido || 0)}</p>
          </div>
          <div>
            <p className="text-lime-300/70 text-xs">Comissao Venda</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.comissaoVendaTotal || 0)}</p>
          </div>
          <div>
            <p className="text-lime-300/70 text-xs">Comissao Over</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.comissaoOverTotal || 0)}</p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detalhamento Comissao */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-lime-400" />
            <h2 className="font-semibold text-gray-100">Detalhamento</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-[#232a3b]">
              <div>
                <p className="font-medium text-gray-100">Comissao sobre Vendas</p>
                <p className="text-sm text-gray-400">2,5% de {formatCurrency(dados?.totalVendido || 0)}</p>
              </div>
              <p className="font-semibold text-lime-400">{formatCurrency(dados?.comissaoVendaTotal || 0)}</p>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[#232a3b]">
              <div>
                <p className="font-medium text-gray-100">Comissao sobre Over</p>
                <p className="text-sm text-gray-400">Progressiva por faixa</p>
              </div>
              <p className="font-semibold text-emerald-400">{formatCurrency(dados?.comissaoOverTotal || 0)}</p>
            </div>

            <div className="flex justify-between items-center py-3 bg-lime-400/10 rounded-lg px-4 -mx-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-lime-400" />
                <p className="font-bold text-lime-400">TOTAL</p>
              </div>
              <p className="text-xl font-bold text-lime-400">{formatCurrency(dados?.comissaoTotal || 0)}</p>
            </div>
          </div>
        </div>

        {/* Faixas Progressivas */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-lime-400" />
            <h2 className="font-semibold text-gray-100">Faixas Progressivas</h2>
          </div>

          {dados?.detalhamentoFaixas && dados.detalhamentoFaixas.length > 0 ? (
            <div className="space-y-3">
              {dados.detalhamentoFaixas.map((f, i) => (
                <div key={i} className="py-3 border-b border-[#232a3b] last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-100">{f.faixa}</p>
                      <p className="text-sm text-gray-400">
                        Volume: {formatCurrency(f.volumeNaFaixa)} | {(f.percentualOver * 100).toFixed(0)}% over
                      </p>
                    </div>
                    <p className="font-semibold text-lime-400">
                      {formatCurrency(f.comissaoOverFaixa)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">
              {(dados?.totalVendido || 0) < 60000
                ? "Volume abaixo do minimo para comissao (R$ 60.000)"
                : "Nenhum over acumulado neste mes"}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-[#232a3b]">
            <p className="text-sm text-gray-400">
              Faixa atual: <span className="font-medium text-gray-300">{dados?.faixaAtual}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Pagamentos Recebidos */}
      {(() => {
        const vendas = dados?.vendas || [];
        const pagas = vendas.filter(v => v.comissaoVendaPaga || v.comissaoOverPaga);
        const totalPago = vendas.reduce((s, v) =>
          s + (v.comissaoVendaPaga ? v.comissaoVenda : 0) + (v.comissaoOverPaga ? v.comissaoOver : 0), 0);
        const totalPendente = vendas.reduce((s, v) =>
          s + (!v.comissaoVendaPaga ? v.comissaoVenda : 0) + (!v.comissaoOverPaga ? v.comissaoOver : 0), 0);

        if (vendas.length === 0) return null;

        return (
          <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] overflow-hidden">
            {/* Header clicável */}
            <button
              onClick={() => setPagamentosAberto(!pagamentosAberto)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#232a3b] transition"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <p className="font-semibold text-gray-100 text-sm">Pagamentos Recebidos</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pagas.length} de {vendas.length} vendas com pagamento · sinalizado pelo financeiro
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">{formatCurrency(totalPago)}</p>
                  {totalPendente > 0 && (
                    <p className="text-xs text-yellow-400">{formatCurrency(totalPendente)} pendente</p>
                  )}
                </div>
                {pagamentosAberto
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </div>
            </button>

            {/* Conteúdo expandido */}
            {pagamentosAberto && (
              <div className="border-t border-[#232a3b]">
                {pagas.length === 0 ? (
                  <div className="px-6 py-5 text-sm text-gray-400 text-center">
                    Nenhum pagamento registrado ainda neste mês.
                  </div>
                ) : (
                  <div className="divide-y divide-[#232a3b]">
                    {pagas.map((v) => {
                      const valorPago = (v.comissaoVendaPaga ? v.comissaoVenda : 0) + (v.comissaoOverPaga ? v.comissaoOver : 0);
                      const [ano, mes, dia] = v.dataConversao.split("T")[0].split("-");
                      return (
                        <div key={v.id} className="flex items-center justify-between px-6 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-100 truncate">{v.cliente}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-gray-500">{dia}/{mes}/{ano}</p>
                              <div className="flex items-center gap-2">
                                {v.comissaoVendaPaga && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Venda {formatCurrency(v.comissaoVenda)}
                                  </span>
                                )}
                                {v.comissaoOverPaga && v.comissaoOver > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Over {formatCurrency(v.comissaoOver)}
                                  </span>
                                )}
                                {!v.comissaoVendaPaga && (
                                  <span className="text-xs text-yellow-400/70">Venda pendente</span>
                                )}
                                {!v.comissaoOverPaga && v.comissaoOver > 0 && (
                                  <span className="text-xs text-yellow-400/70">Over pendente</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-emerald-400 ml-4 flex-shrink-0">
                            {formatCurrency(valorPago)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Rodapé com totais */}
                <div className="px-6 py-3 bg-[#141820] flex items-center justify-between border-t border-[#232a3b]">
                  <p className="text-xs text-gray-400">Total pago neste mês</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalPago)}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Alertas */}
      {dados?.alertas && dados.alertas.length > 0 && (
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-400">Alertas</h3>
          </div>
          <ul className="space-y-2">
            {dados.alertas.map((a, i) => (
              <li key={i} className="text-sm text-amber-400 flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

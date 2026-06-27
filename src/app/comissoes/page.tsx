"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Zap, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas · Comissões"
        title="Minhas Comissões"
        subtitle={getNomeMes(mesAtual)}
        actions={
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="rounded-lg border border-liv-line bg-liv-surface-2 px-3 py-2 text-sm text-liv-ink"
          />
        }
      />

      {/* Card Principal */}
      <div className="bg-liv-sage/10 rounded-2xl p-8 border border-liv-sage/30">
        <p className="text-liv-sage text-sm font-medium">Comissao Total do Mes</p>
        <p className="text-4xl font-bold mt-2 tabular-nums text-liv-ink">
          {formatCurrency(dados?.comissaoTotal || 0)}
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-liv-sage/70 text-xs">Total Vendido</p>
            <p className="text-lg font-semibold mt-1 tabular-nums text-liv-ink">{formatCurrency(dados?.totalVendido || 0)}</p>
          </div>
          <div>
            <p className="text-liv-sage/70 text-xs">Comissao Venda</p>
            <p className="text-lg font-semibold mt-1 tabular-nums text-liv-ink">{formatCurrency(dados?.comissaoVendaTotal || 0)}</p>
          </div>
          <div>
            <p className="text-liv-sage/70 text-xs">Comissao Over</p>
            <p className="text-lg font-semibold mt-1 tabular-nums text-liv-ink">{formatCurrency(dados?.comissaoOverTotal || 0)}</p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detalhamento Comissao */}
        <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-liv-sage" />
            <h2 className="font-semibold text-liv-ink">Detalhamento</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-liv-line">
              <div>
                <p className="font-medium text-liv-ink">Comissao sobre Vendas</p>
                <p className="text-sm text-liv-muted">2,5% de {formatCurrency(dados?.totalVendido || 0)}</p>
              </div>
              <p className="font-semibold tabular-nums text-liv-sage">{formatCurrency(dados?.comissaoVendaTotal || 0)}</p>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-liv-line">
              <div>
                <p className="font-medium text-liv-ink">Comissao sobre Over</p>
                <p className="text-sm text-liv-muted">Progressiva por faixa</p>
              </div>
              <p className="font-semibold tabular-nums text-liv-teal">{formatCurrency(dados?.comissaoOverTotal || 0)}</p>
            </div>

            <div className="flex justify-between items-center py-3 bg-liv-sage/10 rounded-lg px-4 -mx-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-liv-sage" />
                <p className="font-bold text-liv-sage">TOTAL</p>
              </div>
              <p className="text-xl font-bold tabular-nums text-liv-sage">{formatCurrency(dados?.comissaoTotal || 0)}</p>
            </div>
          </div>
        </div>

        {/* Faixas Progressivas */}
        <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-liv-sage" />
            <h2 className="font-semibold text-liv-ink">Faixas Progressivas</h2>
          </div>

          {dados?.detalhamentoFaixas && dados.detalhamentoFaixas.length > 0 ? (
            <div className="space-y-3">
              {dados.detalhamentoFaixas.map((f, i) => (
                <div key={i} className="py-3 border-b border-liv-line last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-liv-ink">{f.faixa}</p>
                      <p className="text-sm text-liv-muted">
                        Volume: {formatCurrency(f.volumeNaFaixa)} | {(f.percentualOver * 100).toFixed(0)}% over
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-liv-sage">
                      {formatCurrency(f.comissaoOverFaixa)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-liv-muted text-sm py-4">
              {(dados?.totalVendido || 0) < 60000
                ? "Volume abaixo do minimo para comissao (R$ 60.000)"
                : "Nenhum over acumulado neste mes"}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-liv-line">
            <p className="text-sm text-liv-muted">
              Faixa atual: <span className="font-medium text-liv-ink">{dados?.faixaAtual}</span>
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
          <div className="bg-liv-surface rounded-2xl border border-liv-line overflow-hidden">
            {/* Header clicável */}
            <button
              onClick={() => setPagamentosAberto(!pagamentosAberto)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-liv-surface-2 transition"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-liv-sage" />
                <div className="text-left">
                  <p className="font-semibold text-liv-ink text-sm">Pagamentos Recebidos</p>
                  <p className="text-xs text-liv-muted mt-0.5">
                    {pagas.length} de {vendas.length} vendas com pagamento · sinalizado pelo financeiro
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-liv-sage font-bold tabular-nums">{formatCurrency(totalPago)}</p>
                  {totalPendente > 0 && (
                    <p className="text-xs text-liv-gold tabular-nums">{formatCurrency(totalPendente)} pendente</p>
                  )}
                </div>
                {pagamentosAberto
                  ? <ChevronUp className="w-4 h-4 text-liv-muted flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-liv-muted flex-shrink-0" />
                }
              </div>
            </button>

            {/* Conteúdo expandido */}
            {pagamentosAberto && (
              <div className="border-t border-liv-line">
                {pagas.length === 0 ? (
                  <div className="px-6 py-5 text-sm text-liv-muted text-center">
                    Nenhum pagamento registrado ainda neste mês.
                  </div>
                ) : (
                  <div className="divide-y divide-liv-line">
                    {pagas.map((v) => {
                      const valorPago = (v.comissaoVendaPaga ? v.comissaoVenda : 0) + (v.comissaoOverPaga ? v.comissaoOver : 0);
                      const [ano, mes, dia] = v.dataConversao.split("T")[0].split("-");
                      return (
                        <div key={v.id} className="flex items-center justify-between px-6 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-liv-ink truncate">{v.cliente}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-liv-faint tabular-nums">{dia}/{mes}/{ano}</p>
                              <div className="flex items-center gap-2">
                                {v.comissaoVendaPaga && (
                                  <span className="flex items-center gap-1 text-xs text-liv-sage">
                                    <span className="w-1.5 h-1.5 rounded-full bg-liv-sage" />
                                    Venda {formatCurrency(v.comissaoVenda)}
                                  </span>
                                )}
                                {v.comissaoOverPaga && v.comissaoOver > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-liv-sage">
                                    <span className="w-1.5 h-1.5 rounded-full bg-liv-sage" />
                                    Over {formatCurrency(v.comissaoOver)}
                                  </span>
                                )}
                                {!v.comissaoVendaPaga && (
                                  <span className="text-xs text-liv-gold/70">Venda pendente</span>
                                )}
                                {!v.comissaoOverPaga && v.comissaoOver > 0 && (
                                  <span className="text-xs text-liv-gold/70">Over pendente</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-liv-sage ml-4 flex-shrink-0">
                            {formatCurrency(valorPago)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Rodapé com totais */}
                <div className="px-6 py-3 bg-liv-surface-2 flex items-center justify-between border-t border-liv-line">
                  <p className="text-xs text-liv-muted">Total pago neste mês</p>
                  <p className="text-sm font-bold tabular-nums text-liv-sage">{formatCurrency(totalPago)}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Alertas */}
      {dados?.alertas && dados.alertas.length > 0 && (
        <div className="bg-liv-gold/10 border border-liv-gold/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-liv-gold" />
            <h3 className="font-semibold text-liv-gold">Alertas</h3>
          </div>
          <ul className="space-y-2">
            {dados.alertas.map((a, i) => (
              <li key={i} className="text-sm text-liv-gold flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 bg-liv-gold rounded-full flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

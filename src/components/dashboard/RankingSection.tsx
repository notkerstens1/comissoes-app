"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getCurrentWeekRange, getCurrentMonthRange } from "@/lib/dates";
import { Crown, Medal, Trophy, TrendingUp, Target } from "lucide-react";

interface VendedorRanking {
  posicao: number;
  id: string;
  nome: string;
  totalVendido: number;
  qtdVendas: number;
  ticketMedio: number;
  margemMedia: number;
}

interface BadgeInfo {
  id: string;
  nome: string;
  valor: number;
}

interface RankingData {
  inicio: string;
  fim: string;
  ranking: VendedorRanking[];
  badges: {
    melhorMargem: BadgeInfo | null;
    maiorTicket: BadgeInfo | null;
  };
  totais: {
    totalGeralVendido: number;
    totalGeralVendas: number;
  };
}

type Periodo = "semana" | "mes";

export function RankingSection() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [dados, setDados] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeLabel, setRangeLabel] = useState("");

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const range =
        periodo === "semana" ? getCurrentWeekRange() : getCurrentMonthRange();
      setRangeLabel(range.label);

      const res = await fetch(
        `/api/dashboard/ranking?inicio=${range.start}&fim=${range.end}`
      );
      if (res.ok) {
        const data = await res.json();
        setDados(data);
      }
    } catch (error) {
      console.error("Erro ao carregar ranking:", error);
    }
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const getPosicaoIcon = (pos: number) => {
    if (pos === 1)
      return <Crown className="w-5 h-5 text-yellow-400" />;
    if (pos === 2)
      return <Medal className="w-5 h-5 text-gray-400" />;
    if (pos === 3)
      return <Medal className="w-5 h-5 text-amber-600" />;
    return (
      <span className="text-sm font-bold text-gray-500">
        {pos}
      </span>
    );
  };

  const getCardStyle = (pos: number) => {
    if (pos === 1)
      return "bg-yellow-400/5 border-yellow-400/30 ring-1 ring-yellow-400/20";
    if (pos === 2)
      return "bg-[#1a1f2e] border-gray-400/30";
    if (pos === 3)
      return "bg-amber-400/5 border-amber-600/30";
    return "bg-[#1a1f2e] border-[#232a3b]";
  };

  const renderBadges = (vendorId: string) => {
    if (!dados?.badges) return null;
    const badges: React.ReactNode[] = [];

    if (dados.badges.melhorMargem?.id === vendorId) {
      badges.push(
        <span
          key="margem"
          className="inline-flex items-center gap-1 text-[10px] bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded-full font-medium"
        >
          <TrendingUp className="w-3 h-3" />
          Melhor Margem
        </span>
      );
    }
    if (dados.badges.maiorTicket?.id === vendorId) {
      badges.push(
        <span
          key="ticket"
          className="inline-flex items-center gap-1 text-[10px] bg-purple-400/10 text-purple-400 px-2 py-0.5 rounded-full font-medium"
        >
          <Target className="w-3 h-3" />
          Maior Ticket
        </span>
      );
    }

    return badges.length > 0 ? (
      <div className="flex gap-1.5 flex-wrap">{badges}</div>
    ) : null;
  };

  const top5 = dados?.ranking?.slice(0, 5) || [];
  const restante = dados?.ranking?.slice(5) || [];

  return (
    <div className="space-y-5">
      {/* Header + Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-lime-400" />
          <h2 className="text-lg font-bold text-gray-100">
            Ranking de Vendedores
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#141820] rounded-lg p-0.5 border border-[#232a3b]">
            <button
              onClick={() => setPeriodo("semana")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                periodo === "semana"
                  ? "bg-lime-400 text-gray-900"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriodo("mes")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                periodo === "mes"
                  ? "bg-lime-400 text-gray-900"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* Range label */}
      <p className="text-xs text-gray-500">{rangeLabel}</p>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400" />
        </div>
      )}

      {/* Top 5 Podium */}
      {!loading && top5.length > 0 && (
        <div className="space-y-3">
          {top5.map((v) => (
            <div
              key={v.id}
              className={`rounded-xl p-4 border transition hover:shadow-md ${getCardStyle(
                v.posicao
              )}`}
            >
              <div className="flex items-center gap-3">
                {/* Posicao */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0b0f19]/60 shrink-0">
                  {getPosicaoIcon(v.posicao)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-100">{v.nome}</h3>
                    {renderBadges(v.id)}
                  </div>
                </div>

                {/* Metricas desktop */}
                <div className="hidden sm:flex items-center gap-6 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">
                      Vendido
                    </p>
                    <p className="font-bold text-gray-100 text-sm">
                      {formatCurrency(v.totalVendido)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">
                      Vendas
                    </p>
                    <p className="font-bold text-gray-100 text-sm">
                      {v.qtdVendas}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">
                      Ticket
                    </p>
                    <p className="font-bold text-gray-100 text-sm">
                      {formatCurrency(v.ticketMedio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">
                      Margem
                    </p>
                    <p className="font-bold text-gray-100 text-sm">
                      {formatNumber(v.margemMedia)}x
                    </p>
                  </div>
                </div>
              </div>

              {/* Metricas mobile */}
              <div className="sm:hidden grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#232a3b]/50">
                <div>
                  <p className="text-[10px] text-gray-500">Vendido</p>
                  <p className="font-bold text-xs text-gray-100">
                    {formatCurrency(v.totalVendido)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Vendas</p>
                  <p className="font-bold text-xs text-gray-100">
                    {v.qtdVendas}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Ticket</p>
                  <p className="font-bold text-xs text-gray-100">
                    {formatCurrency(v.ticketMedio)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Margem</p>
                  <p className="font-bold text-xs text-gray-100">
                    {formatNumber(v.margemMedia)}x
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela completa (restante apos top 5) */}
      {!loading && restante.length > 0 && (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#232a3b]">
            <h3 className="text-sm font-medium text-gray-400">
              Demais vendedores
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820] text-gray-400">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">#</th>
                  <th className="text-left px-5 py-2.5 font-medium">
                    Vendedor
                  </th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    Vendido
                  </th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    Vendas
                  </th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    Ticket
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3b]">
                {restante.map((v) => (
                  <tr key={v.id} className="hover:bg-[#232a3b]">
                    <td className="px-5 py-2.5 text-gray-500 font-medium">
                      {v.posicao}
                    </td>
                    <td className="px-5 py-2.5 text-gray-100 font-medium">
                      <div className="flex items-center gap-2">
                        {v.nome}
                        {renderBadges(v.id)}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-100">
                      {formatCurrency(v.totalVendido)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-400">
                      {v.qtdVendas}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-400">
                      {formatCurrency(v.ticketMedio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totais */}
      {!loading && dados && dados.ranking.length > 0 && (
        <div className="flex justify-between items-center bg-[#141820] rounded-xl px-5 py-3 border border-[#232a3b]">
          <span className="text-sm font-medium text-gray-400">
            Total do time
          </span>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase">Vendido</p>
              <p className="font-bold text-lime-400">
                {formatCurrency(dados.totais.totalGeralVendido)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase">Vendas</p>
              <p className="font-bold text-lime-400">
                {dados.totais.totalGeralVendas}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && (!dados?.ranking || dados.ranking.length === 0) && (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            Nenhuma venda no periodo
          </h3>
          <p className="text-gray-400">
            Aguardando registro de vendas para montar o ranking.
          </p>
        </div>
      )}
    </div>
  );
}

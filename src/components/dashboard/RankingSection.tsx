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

  // Cor do indicador de posicao — campeao em dourado, depois areia e sage.
  const rankTone = (pos: number) => {
    if (pos === 1) return "text-liv-gold";
    if (pos === 2) return "text-liv-sand";
    if (pos === 3) return "text-liv-sage";
    return "text-liv-faint";
  };

  const rankIcon = (pos: number) => {
    if (pos === 1) return <Crown className="h-[1.15rem] w-[1.15rem]" />;
    if (pos <= 3) return <Medal className="h-[1.15rem] w-[1.15rem]" />;
    return <span className="text-sm font-bold tabular-nums">{pos}</span>;
  };

  const renderBadges = (vendorId: string) => {
    if (!dados?.badges) return null;
    const badges: React.ReactNode[] = [];

    if (dados.badges.melhorMargem?.id === vendorId) {
      badges.push(
        <span
          key="margem"
          className="inline-flex items-center gap-1 rounded-full bg-liv-sage/12 px-2 py-0.5 text-[10px] font-medium text-liv-sage"
        >
          <TrendingUp className="h-3 w-3" />
          Melhor margem
        </span>
      );
    }
    if (dados.badges.maiorTicket?.id === vendorId) {
      badges.push(
        <span
          key="ticket"
          className="inline-flex items-center gap-1 rounded-full bg-liv-gold/12 px-2 py-0.5 text-[10px] font-medium text-liv-gold"
        >
          <Target className="h-3 w-3" />
          Maior ticket
        </span>
      );
    }

    return badges.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">{badges}</div>
    ) : null;
  };

  // Coluna de apoio (Vendido / Ticket / Margem)
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wide text-liv-faint">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-liv-ink">{value}</p>
    </div>
  );

  const ranking = dados?.ranking ?? [];
  const campeao = ranking[0];
  const top = ranking.slice(1, 5);
  const restante = ranking.slice(5);

  return (
    <section className="space-y-5">
      {/* Header + toggle de periodo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-liv-sage" />
          <h2 className="text-lg font-semibold tracking-tight text-liv-ink">
            Ranking de vendedores
          </h2>
        </div>

        <div className="inline-flex rounded-full border border-liv-line bg-liv-surface-2 p-0.5">
          {(["semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                periodo === p
                  ? "bg-liv-sage text-liv-bg"
                  : "text-liv-muted hover:text-liv-ink"
              }`}
            >
              {p === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-liv-faint">{rangeLabel}</p>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-liv-line border-t-liv-sage" />
        </div>
      )}

      {/* Campeao */}
      {!loading && campeao && (
        <article className="liv-rise relative overflow-hidden rounded-2xl border border-liv-gold/25 bg-liv-surface p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-liv-gold/10 blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-liv-surface-2 text-liv-gold ring-1 ring-liv-gold/30">
              {rankIcon(1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-bold text-liv-ink">{campeao.nome}</h3>
                {renderBadges(campeao.id)}
              </div>
              <p className="mt-0.5 text-xs text-liv-faint">Líder em vendas no período</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-bold leading-none tabular-nums text-liv-ink">
                {campeao.qtdVendas}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-liv-faint">
                vendas
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-liv-line pt-4">
            <Stat label="Vendido" value={formatCurrency(campeao.totalVendido)} />
            <Stat label="Ticket" value={formatCurrency(campeao.ticketMedio)} />
            <Stat label="Margem" value={`${formatNumber(campeao.margemMedia)}x`} />
          </div>
        </article>
      )}

      {/* Posicoes 2 a 5 */}
      {!loading && top.length > 0 && (
        <div className="space-y-2.5">
          {top.map((v, i) => (
            <article
              key={v.id}
              className="liv-rise flex items-center gap-4 rounded-2xl border border-liv-line bg-liv-surface px-4 py-3.5 transition-colors hover:border-liv-line/60 hover:bg-liv-surface-2"
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-liv-surface-2 ${rankTone(
                  v.posicao
                )}`}
              >
                {rankIcon(v.posicao)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-liv-ink">{v.nome}</h3>
                  {renderBadges(v.id)}
                </div>
                {/* Métricas de apoio no mobile */}
                <div className="mt-1 flex items-center gap-3 text-xs text-liv-muted tabular-nums sm:hidden">
                  <span>{formatCurrency(v.totalVendido)}</span>
                  <span className="text-liv-faint">·</span>
                  <span>ticket {formatCurrency(v.ticketMedio)}</span>
                </div>
              </div>

              {/* Métricas de apoio no desktop */}
              <div className="hidden items-center gap-7 sm:flex">
                <Stat label="Vendido" value={formatCurrency(v.totalVendido)} />
                <Stat label="Ticket" value={formatCurrency(v.ticketMedio)} />
                <Stat label="Margem" value={`${formatNumber(v.margemMedia)}x`} />
              </div>

              {/* Métrica primária: vendas */}
              <div className="shrink-0 text-right">
                <p className="text-xl font-bold leading-none tabular-nums text-liv-sage">
                  {v.qtdVendas}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-liv-faint">
                  vendas
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Tabela — demais vendedores */}
      {!loading && restante.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-liv-line bg-liv-surface">
          <div className="border-b border-liv-line px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-liv-faint">
              Demais vendedores
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-liv-surface-2 text-liv-faint">
                <tr>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide">
                    #
                  </th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide">
                    Vendedor
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide">
                    Vendido
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide">
                    Ticket
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide">
                    Vendas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {restante.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-liv-surface-2">
                    <td className="px-5 py-3 font-medium tabular-nums text-liv-faint">
                      {v.posicao}
                    </td>
                    <td className="px-5 py-3 font-medium text-liv-ink">
                      <div className="flex items-center gap-2">
                        {v.nome}
                        {renderBadges(v.id)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-liv-muted">
                      {formatCurrency(v.totalVendido)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-liv-muted">
                      {formatCurrency(v.ticketMedio)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-liv-ink">
                      {v.qtdVendas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total do time */}
      {!loading && ranking.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-liv-line bg-liv-surface-2 px-5 py-4">
          <span className="text-sm font-medium text-liv-muted">Total do time</span>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-liv-faint">Vendido</p>
              <p className="mt-0.5 font-bold tabular-nums text-liv-ink">
                {formatCurrency(dados!.totais.totalGeralVendido)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-liv-faint">Vendas</p>
              <p className="mt-0.5 font-bold tabular-nums text-liv-sage">
                {dados!.totais.totalGeralVendas}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && ranking.length === 0 && (
        <div className="rounded-2xl border border-liv-line bg-liv-surface px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-liv-surface-2">
            <Trophy className="h-6 w-6 text-liv-faint" />
          </div>
          <h3 className="text-base font-semibold text-liv-ink">
            Nenhuma venda neste período
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-liv-muted">
            Assim que as vendas forem registradas, o ranking aparece aqui — ordenado por
            quantidade de vendas.
          </p>
        </div>
      )}
    </section>
  );
}

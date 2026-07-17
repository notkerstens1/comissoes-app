"use client";

import * as React from "react";

interface Ranked {
  id: string;
  nome: string;
  totalVendido: number;
  qtdVendas: number;
  ticketMedio: number;
  posicao: number;
}

interface RankingPayload {
  ranking: Ranked[];
  totais: { totalGeralVendido: number; totalGeralVendas: number };
}

const brl0 = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function VendasPorVendedor({
  inicio,
  fim,
  periodoLabel,
}: {
  inicio: string;
  fim: string;
  periodoLabel: string;
}) {
  const [data, setData] = React.useState<RankingPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/dashboard/ranking?inicio=${inicio}&fim=${fim}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json) setData(json as RankingPayload);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [inicio, fim]);

  if (loading || !data) {
    return <div className="liv-skeleton h-64 rounded-2xl" />;
  }

  const comVendas = [...data.ranking]
    .filter((r) => r.qtdVendas > 0)
    .sort((a, b) => b.qtdVendas - a.qtdVendas || b.totalVendido - a.totalVendido);

  return (
    <div className="rounded-2xl border border-liv-line bg-liv-surface p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-liv-ink">Vendas por vendedor</h2>
          <p className="mt-0.5 text-sm text-liv-muted tabular-nums">
            {data.totais.totalGeralVendas}{" "}
            {data.totais.totalGeralVendas === 1 ? "venda" : "vendas"}
            <span className="mx-1.5 text-liv-faint">·</span>
            {brl0(data.totais.totalGeralVendido)}
          </p>
        </div>
        <span className="rounded-full border border-liv-line px-3 py-1 text-xs font-medium text-liv-muted">
          {periodoLabel}
        </span>
      </div>

      {comVendas.length === 0 ? (
        <p className="py-8 text-center text-sm text-liv-faint">
          Nenhuma venda registrada no período.
        </p>
      ) : (
        <div className="space-y-1.5">
          {comVendas.map((v, i) => (
            <div
              key={v.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                i === 0 ? "bg-liv-sage/10" : "hover:bg-liv-surface-2"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  i === 0
                    ? "bg-liv-sage text-liv-bg"
                    : "bg-liv-surface-2 text-liv-muted"
                }`}
              >
                {iniciais(v.nome)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-liv-ink">{v.nome}</p>
                <p className="text-xs text-liv-faint tabular-nums">
                  ticket {brl0(v.ticketMedio)}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-liv-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums text-liv-muted">
                {v.qtdVendas} {v.qtdVendas === 1 ? "venda" : "vendas"}
              </span>

              <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums text-liv-ink">
                {brl0(v.totalVendido)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

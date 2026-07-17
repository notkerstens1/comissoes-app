"use client";

import * as React from "react";
import { CountUp } from "@/components/ui/count-up";
import type { MetaMesResult } from "@/lib/meta-mes";

interface MetaMesPayload extends MetaMesResult {
  mes: string;
  mesLabel: string;
}

const brl0 = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

function pct(part: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, (part / total) * 100)) : 0;
}

// Barra segmentada rumo a meta de contratos: efetivo (solido) + a finalizar (hachurado).
function SegmentedBar({
  efetivo,
  aFinalizar,
  meta,
}: {
  efetivo: number;
  aFinalizar: number;
  meta: number;
}) {
  const pctEfetivo = pct(efetivo, meta);
  const pctAFinalizar = Math.min(100 - pctEfetivo, pct(aFinalizar, meta));
  const total = pctEfetivo + pctAFinalizar;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(total)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex h-3 w-full overflow-hidden rounded-full bg-liv-surface-2"
    >
      <div
        className="h-full bg-liv-sage transition-[width] duration-700 ease-out"
        style={{ width: `${pctEfetivo}%` }}
      />
      <div
        className="h-full bg-liv-sage/35 transition-[width] duration-700 ease-out"
        style={{
          width: `${pctAFinalizar}%`,
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 4px, transparent 4px 8px)",
        }}
      />
    </div>
  );
}

function Legenda({
  efetivo,
  aFinalizar,
  render,
}: {
  efetivo: number;
  aFinalizar: number;
  render: (n: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
      <span className="flex items-center gap-1.5 text-liv-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-liv-sage" />
        Efetivo (caixa) <b className="tabular-nums text-liv-ink">{render(efetivo)}</b>
      </span>
      <span className="flex items-center gap-1.5 text-liv-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-liv-sage/35" />
        A finalizar <b className="tabular-nums text-liv-ink">{render(aFinalizar)}</b>
      </span>
    </div>
  );
}

export function MetaProgressoCard() {
  const [data, setData] = React.useState<MetaMesPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetch("/api/dashboard/meta-mes")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json) setData(json as MetaMesPayload);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) {
    return <div className="liv-skeleton h-52 rounded-2xl" />;
  }

  const progressoContratos =
    data.meta.vendas > 0 ? Math.round((data.total.vendas / data.meta.vendas) * 100) : 0;

  return (
    <div className="rounded-2xl border border-liv-line bg-liv-surface p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">
            Placar do mês
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-liv-ink">{data.mesLabel}</h2>
        </div>
        <span className="rounded-full border border-liv-line px-3 py-1 text-xs text-liv-muted">
          {data.vendedoresAtivos} {data.vendedoresAtivos === 1 ? "vendedor" : "vendedores"}
        </span>
      </div>

      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        {/* Contratos — a meta de verdade (quantidade) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">
                Contratos
              </p>
              <p className="mt-1 text-[2rem] font-bold leading-none tracking-tight tabular-nums text-liv-ink">
                <CountUp value={data.total.vendas} durationMs={700} />
                <span className="text-lg font-semibold text-liv-faint"> / {data.meta.vendas}</span>
              </p>
              <p className="mt-1 text-xs text-liv-faint">meta do mês · {data.vendedoresAtivos} vendedores</p>
            </div>
            <span className="shrink-0 rounded-full bg-liv-sage/14 px-2.5 py-1 text-sm font-bold tabular-nums text-liv-sage">
              {progressoContratos}%
            </span>
          </div>

          <SegmentedBar
            efetivo={data.efetivo.vendas}
            aFinalizar={data.aFinalizar.vendas}
            meta={data.meta.vendas}
          />

          <Legenda
            efetivo={data.efetivo.vendas}
            aFinalizar={data.aFinalizar.vendas}
            render={(n) => n}
          />
        </div>

        {/* Faturamento — realizado + projecao de referencia (sem barra) */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">
              Faturamento
            </p>
            <p className="mt-1 text-[2rem] font-bold leading-none tracking-tight tabular-nums text-liv-ink">
              <CountUp value={data.total.faturamento} prefix="R$ " durationMs={700} />
            </p>
            <p className="mt-1 text-xs text-liv-faint">
              projeção do mês {brl0(data.meta.faturamento)}
            </p>
          </div>

          <div className="mt-1">
            <Legenda
              efetivo={data.efetivo.faturamento}
              aFinalizar={data.aFinalizar.faturamento}
              render={(n) => brl0(n)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

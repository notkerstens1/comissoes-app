"use client";

import * as React from "react";
import { CountUp } from "@/components/ui/count-up";
import type { MetaMesResult } from "@/lib/meta-mes";

interface MetaMesPayload extends MetaMesResult {
  mes: string;
  mesLabel: string;
  vendedoresNomes: string[];
}

// Paleta do placar (referencia dark + lima). Autocontida: card escuro sobre o
// dashboard claro, como no print.
const C = {
  card: "#1E1F1C",
  panel: "#2A2C27",
  panel2: "#323530",
  lime: "#C4F135",
  ink: "#F4F5F0",
  muted: "#9BA096",
  faint: "#6E7268",
  line: "rgba(255,255,255,0.08)",
};

const brl0 = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

const num = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Coluna({
  label,
  valor,
  sub,
}: {
  label: string;
  valor: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium" style={{ color: C.muted }}>
        {label}
      </p>
      <p
        className="mt-2 text-[2.1rem] font-bold leading-none tracking-tight tabular-nums"
        style={{ color: C.ink }}
      >
        {valor}
      </p>
      {sub && (
        <p className="mt-2 text-[12px] tabular-nums" style={{ color: C.faint }}>
          {sub}
        </p>
      )}
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
    return <div className="liv-skeleton h-64 rounded-[28px]" />;
  }

  const meta = data.meta.vendas || 1;
  const pctEfetivo = Math.max(0, Math.min(100, (data.efetivo.vendas / meta) * 100));
  const pctAFinalizar = Math.min(100 - pctEfetivo, Math.max(0, (data.aFinalizar.vendas / meta) * 100));
  const pctTotal = Math.round(pctEfetivo + pctAFinalizar);

  const nomes = data.vendedoresNomes ?? [];
  const mostra = nomes.slice(0, 6);
  const resto = nomes.length - mostra.length;

  return (
    <div
      className="grid gap-4 rounded-[28px] p-4 lg:grid-cols-[1.7fr_1fr]"
      style={{ background: C.card }}
    >
      {/* ESQUERDA — KPIs + barra + time */}
      <div className="flex flex-col justify-between gap-7 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.faint }}>
              Placar do mês
            </p>
            <h2 className="mt-1 text-lg font-bold" style={{ color: C.ink }}>
              {data.mesLabel}
            </h2>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: C.lime, color: "#20220F" }}
          >
            {pctTotal}% da meta
          </span>
        </div>

        {/* 3 colunas de KPI */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          <Coluna
            label="Contratos"
            valor={
              <>
                <CountUp value={data.total.vendas} durationMs={700} />
                <span className="text-lg font-semibold" style={{ color: C.faint }}>
                  {" "}/ {num(data.meta.vendas)}
                </span>
              </>
            }
            sub={`meta do mês · ${data.vendedoresAtivos} vendedores`}
          />
          <Coluna
            label="Efetivo"
            valor={<CountUp value={data.efetivo.vendas} durationMs={700} />}
            sub={brl0(data.efetivo.faturamento)}
          />
          <Coluna
            label="A finalizar"
            valor={<CountUp value={data.aFinalizar.vendas} durationMs={700} />}
            sub={brl0(data.aFinalizar.faturamento)}
          />
        </div>

        {/* Barra segmentada rumo à meta */}
        <div>
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span style={{ color: C.muted }}>
              <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: C.lime }} />{" "}
              Efetivo <span className="tabular-nums" style={{ color: C.ink }}>{data.efetivo.vendas}</span>
              <span className="mx-2" style={{ color: C.faint }}>·</span>
              <span
                className="inline-block h-2 w-2 rounded-full align-middle"
                style={{ background: "rgba(196,241,53,0.35)" }}
              />{" "}
              A finalizar <span className="tabular-nums" style={{ color: C.ink }}>{data.aFinalizar.vendas}</span>
            </span>
            <span className="tabular-nums" style={{ color: C.muted }}>
              meta {num(data.meta.vendas)}
            </span>
          </div>
          <div
            className="flex h-3.5 w-full gap-1 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
            role="progressbar"
            aria-valuenow={pctTotal}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${pctEfetivo}%`, background: C.lime }}
            />
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pctAFinalizar}%`,
                background: "rgba(196,241,53,0.32)",
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 5px, transparent 5px 10px)",
              }}
            />
          </div>
        </div>

        {/* Avatars do time */}
        {mostra.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {mostra.map((nome, i) => (
                <span
                  key={i}
                  title={nome}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: i % 2 === 0 ? C.panel2 : C.panel,
                    color: C.ink,
                    boxShadow: `0 0 0 2.5px ${C.card}`,
                  }}
                >
                  {iniciais(nome)}
                </span>
              ))}
              {resto > 0 && (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: C.lime, color: "#20220F", boxShadow: `0 0 0 2.5px ${C.card}` }}
                >
                  +{resto}
                </span>
              )}
            </div>
            <span className="text-[12px]" style={{ color: C.faint }}>
              time trabalhando a meta
            </span>
          </div>
        )}
      </div>

      {/* DIREITA — card aninhado de faturamento */}
      <div className="flex flex-col gap-5 rounded-[22px] p-5 sm:p-6" style={{ background: C.panel }}>
        <div>
          <p className="text-[12px] font-medium" style={{ color: C.muted }}>
            Faturamento realizado
          </p>
          <p
            className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums"
            style={{ color: C.ink }}
          >
            <CountUp value={data.total.faturamento} prefix="R$ " durationMs={700} />
          </p>
          <span
            className="mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "rgba(196,241,53,0.14)", color: C.lime }}
          >
            projeção {brl0(data.meta.faturamento)}
          </span>
        </div>

        {/* mini-cards: efetivo (destacado) + a finalizar */}
        <div className="mt-auto grid gap-2.5">
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: C.lime }}
          >
            <span className="text-[12px] font-semibold" style={{ color: "#20220F" }}>
              Efetivo
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: "#20220F" }}>
              {brl0(data.efetivo.faturamento)}
            </span>
          </div>
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: C.panel2 }}
          >
            <span className="text-[12px] font-semibold" style={{ color: C.muted }}>
              A finalizar
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: C.ink }}>
              {brl0(data.aFinalizar.faturamento)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

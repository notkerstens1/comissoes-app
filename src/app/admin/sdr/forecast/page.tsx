"use client";

import { useEffect, useState, useCallback } from "react";
import { Target, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

const ESTAGIOS_LABELS: Record<string, string> = {
  REUNIAO:    "Reunião",
  PROPOSTA:   "Proposta",
  NEGOCIACAO: "Negociação",
  FECHADA:    "Fechada",
};

type ForecastData = {
  totalOportunidades: number;
  totalForecast: number;
  totalPonderado: number;
  porEstagio: Record<string, { count: number; valorTotal: number; valorPonderado: number }>;
  porVendedor: { id: string; nome: string; qtd: number; valorTotal: number; valorPonderado: number; probMedia: number }[];
};

export default function ForecastSDR() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sdr/forecast");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage" />
      </div>
    );
  }

  const estagios = ["REUNIAO", "PROPOSTA", "NEGOCIACAO", "FECHADA"];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pré-venda · SDR"
        title="Forecast de Oportunidades"
        subtitle="Pipeline de vendas baseado nas oportunidades abertas do time"
      />

      {/* Cards resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Oportunidades Abertas" tone="accent" value={data.totalOportunidades} />
        <StatCard
          label="Forecast Total"
          tone="accent"
          value={formatCurrency(data.totalForecast)}
          meta="soma dos valores estimados"
        />
        <StatCard
          label="Forecast Ponderado"
          tone="positive"
          value={formatCurrency(data.totalPonderado)}
          meta="valor × probabilidade média"
        />
      </div>

      {/* Por estágio */}
      <div className="rounded-2xl border border-liv-line bg-liv-surface p-5">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Pipeline por Estágio</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {estagios.map((est) => {
            const d = data.porEstagio[est] ?? { count: 0, valorTotal: 0, valorPonderado: 0 };
            const cores: Record<string, string> = {
              REUNIAO: "text-liv-info border-liv-info/30",
              PROPOSTA: "text-liv-gold border-liv-gold/30",
              NEGOCIACAO: "text-liv-orange border-liv-orange/30",
              FECHADA: "text-liv-sage border-liv-sage/30",
            };
            return (
              <div key={est} className={`rounded-xl border bg-liv-surface-2 p-4 ${cores[est]}`}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]">{ESTAGIOS_LABELS[est]}</p>
                <p className="text-2xl font-bold tabular-nums">{d.count}</p>
                <p className="mt-1 text-xs text-liv-muted tabular-nums">{formatCurrency(d.valorTotal)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Por vendedor */}
      <div className="overflow-hidden rounded-2xl border border-liv-line bg-liv-surface">
        <div className="flex items-center gap-2 border-b border-liv-line px-5 py-4">
          <Users className="h-4 w-4 text-liv-faint" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Por Vendedor</h2>
        </div>
        {data.porVendedor.length === 0 ? (
          <div className="p-8 text-center text-liv-muted">
            <Target className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>Nenhuma oportunidade registrada ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-liv-line bg-liv-surface-2">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Vendedor</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Oport.</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Forecast Total</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Ponderado</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Prob. Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {data.porVendedor.map((v) => (
                  <tr key={v.id} className="transition hover:bg-liv-surface-2">
                    <td className="px-4 py-3 font-medium text-liv-ink">{v.nome}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-liv-muted">{v.qtd}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-liv-info">{formatCurrency(v.valorTotal)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-liv-sage">{formatCurrency(v.valorPonderado)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium tabular-nums ${v.probMedia >= 70 ? "text-liv-sage" : v.probMedia >= 40 ? "text-liv-gold" : "text-liv-danger"}`}>
                        {v.probMedia}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { formatDateShort } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TeamTrendChartProps {
  dailyData: Array<{
    date: string;
    traffic: {
      pessoasAlcancadas: number;
      totalLeads: number;
      valorInvestidoVendas: number;
      valorInvestidoBranding: number;
      valorGasto: number;
    };
    commercial: {
      atendidos: number;
      mql: number;
      reunioes: number;
      propostas: number;
      fechados: number;
      valorEmVendas: number;
      leadsDescartados: number;
    };
  }>;
  onDayClick: (date: string) => void;
}

type Tab = "topo" | "comercial" | "receita";

const tabs: { value: Tab; label: string }[] = [
  { value: "topo", label: "Topo" },
  { value: "comercial", label: "Comercial" },
  { value: "receita", label: "Receita" },
];

export function TeamTrendChart({ dailyData, onDayClick }: TeamTrendChartProps) {
  const [activeTab, setActiveTab] = useState<Tab>("topo");

  const chartData = dailyData.map((d) => ({
    date: d.date,
    dateLabel: formatDateShort(d.date),
    pessoasAlcancadas: d.traffic.pessoasAlcancadas,
    leads: d.traffic.totalLeads,
    atendidos: d.commercial.atendidos,
    mql: d.commercial.mql,
    reunioes: d.commercial.reunioes,
    propostas: d.commercial.propostas,
    fechados: d.commercial.fechados,
    valorEmVendas: d.commercial.valorEmVendas,
  }));

  const handleChartClick = (data: unknown) => {
    const event = data as { activeLabel?: string } | null;
    if (event?.activeLabel) {
      onDayClick(event.activeLabel);
    }
  };

  return (
    <div className="bg-liv-surface rounded-xl border border-liv-line p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-liv-ink">
          Tendencia do Time
        </h3>
        <div className="inline-flex rounded-full bg-liv-surface-2 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition",
                activeTab === tab.value
                  ? "bg-liv-teal text-liv-bg"
                  : "bg-liv-surface-2 text-liv-muted hover:bg-liv-surface"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {activeTab === "receita" ? (
          <AreaChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--liv-line))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 12, fill: 'oklch(var(--liv-faint))' }}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 12, fill: 'oklch(var(--liv-faint))' }}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value) || 0), "Valor em vendas"]}
              labelFormatter={(label: any) => formatDateShort(String(label || ""))}
              contentStyle={{ backgroundColor: 'oklch(var(--liv-surface))', border: '1px solid oklch(var(--liv-line))', borderRadius: '8px' }}
              itemStyle={{ color: 'oklch(var(--liv-ink))' }}
              labelStyle={{ color: 'oklch(var(--liv-faint))' }}
            />
            <Area
              type="monotone"
              dataKey="valorEmVendas"
              stroke="oklch(var(--liv-sage))"
              fill="oklch(var(--liv-sage))"
              fillOpacity={0.2}
              name="Valor em vendas"
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--liv-line))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 12, fill: 'oklch(var(--liv-faint))' }}
            />
            <YAxis tick={{ fontSize: 12, fill: 'oklch(var(--liv-faint))' }} />
            <Tooltip
              labelFormatter={(label: any) => formatDateShort(String(label || ""))}
              contentStyle={{ backgroundColor: 'oklch(var(--liv-surface))', border: '1px solid oklch(var(--liv-line))', borderRadius: '8px' }}
              itemStyle={{ color: 'oklch(var(--liv-ink))' }}
              labelStyle={{ color: 'oklch(var(--liv-faint))' }}
            />

            {activeTab === "topo" && (
              <>
                <Line
                  type="monotone"
                  dataKey="pessoasAlcancadas"
                  stroke="oklch(var(--liv-info))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Pessoas alcancadas"
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="oklch(var(--liv-sage))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Leads"
                />
              </>
            )}

            {activeTab === "comercial" && (
              <>
                <Line
                  type="monotone"
                  dataKey="atendidos"
                  stroke="oklch(var(--liv-info))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Atendidos"
                />
                <Line
                  type="monotone"
                  dataKey="mql"
                  stroke="oklch(var(--liv-sage))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="MQL"
                />
                <Line
                  type="monotone"
                  dataKey="reunioes"
                  stroke="oklch(var(--liv-teal))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Reunioes"
                />
                <Line
                  type="monotone"
                  dataKey="propostas"
                  stroke="oklch(var(--liv-gold))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Propostas"
                />
                <Line
                  type="monotone"
                  dataKey="fechados"
                  stroke="oklch(var(--liv-violet))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Fechados"
                />
              </>
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

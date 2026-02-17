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
    <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Tendencia do Time
        </h3>
        <div className="inline-flex rounded-full bg-[#141820] p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition",
                activeTab === tab.value
                  ? "bg-teal-400 text-gray-900"
                  : "bg-[#141820] text-gray-400 hover:bg-[#232a3b]"
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
            <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value) || 0), "Valor em vendas"]}
              labelFormatter={(label: any) => formatDateShort(String(label || ""))}
              contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #232a3b', borderRadius: '8px' }}
              itemStyle={{ color: '#e5e7eb' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area
              type="monotone"
              dataKey="valorEmVendas"
              stroke="#a3e635"
              fill="#a3e635"
              fillOpacity={0.2}
              name="Valor em vendas"
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
            />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip
              labelFormatter={(label: any) => formatDateShort(String(label || ""))}
              contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #232a3b', borderRadius: '8px' }}
              itemStyle={{ color: '#e5e7eb' }}
              labelStyle={{ color: '#9ca3af' }}
            />

            {activeTab === "topo" && (
              <>
                <Line
                  type="monotone"
                  dataKey="pessoasAlcancadas"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Pessoas alcancadas"
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#a3e635"
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
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Atendidos"
                />
                <Line
                  type="monotone"
                  dataKey="mql"
                  stroke="#a3e635"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="MQL"
                />
                <Line
                  type="monotone"
                  dataKey="reunioes"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Reunioes"
                />
                <Line
                  type="monotone"
                  dataKey="propostas"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Propostas"
                />
                <Line
                  type="monotone"
                  dataKey="fechados"
                  stroke="#c084fc"
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

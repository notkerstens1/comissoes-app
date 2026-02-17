"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatDateShort } from "@/lib/dates";
import { calculateKPIs, getInvestment } from "@/lib/kpis";

interface FunnelEfficiencyChartProps {
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
  investmentType: "vendas" | "total";
  onDayClick: (date: string) => void;
}

export function FunnelEfficiencyChart({
  dailyData,
  investmentType,
  onDayClick,
}: FunnelEfficiencyChartProps) {
  const chartData = dailyData.map((d) => {
    const investment = getInvestment(
      d.traffic.valorInvestidoVendas,
      d.traffic.valorInvestidoBranding,
      investmentType
    );
    const kpis = calculateKPIs(
      investment,
      d.traffic.pessoasAlcancadas,
      d.traffic.totalLeads,
      d.commercial.mql,
      d.commercial.reunioes,
      d.commercial.fechados
    );
    return {
      date: d.date,
      cpm: kpis.cpm,
      cpl: kpis.cpl,
      custoMql: kpis.custoMql,
      custoSql: kpis.custoSql,
      cac: kpis.cac,
    };
  });

  const handleChartClick = (data: unknown) => {
    const event = data as { activeLabel?: string } | null;
    if (event?.activeLabel) {
      onDayClick(event.activeLabel);
    }
  };

  const formatTooltipValue = (value: number | null): string => {
    if (value === null || value === undefined) return "\u2014";
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">
        Eficiencia do Funil
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <YAxis
            tickFormatter={(v: number) => formatTooltipValue(v)}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              formatTooltipValue(typeof value === "number" ? value : null),
              String(name || ""),
            ]}
            labelFormatter={(label: any) => formatDateShort(String(label || ""))}
            contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #232a3b', borderRadius: '8px' }}
            itemStyle={{ color: '#e5e7eb' }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="cpm"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name="CPM"
          />
          <Line
            type="monotone"
            dataKey="cpl"
            stroke="#a3e635"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name="CPL"
          />
          <Line
            type="monotone"
            dataKey="custoMql"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name="Custo MQL"
          />
          <Line
            type="monotone"
            dataKey="custoSql"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name="Custo SQL"
          />
          <Line
            type="monotone"
            dataKey="cac"
            stroke="#c084fc"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name="CAC"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

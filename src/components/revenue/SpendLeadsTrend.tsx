"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface TrendPoint {
  date: string;
  spend: number;
  leads: number;
  sales: number;
  revenue: number;
}

export function SpendLeadsTrend({ trend }: { trend: TrendPoint[] }) {
  const formatted = trend.map((t) => ({
    ...t,
    dateLabel: t.date.slice(5), // "MM-DD"
  }));

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Investimento x Leads x Vendas</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#1a1f2e",
                border: "1px solid #232a3b",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="Investido (R$)"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sales"
              name="Vendas"
              stroke="#a3e635"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

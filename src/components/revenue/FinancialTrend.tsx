"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TrendPoint {
  mes: string;
  receita: number;
  despesa: number;
  saldo: number;
}

export function FinancialTrend({ trend }: { trend: TrendPoint[] }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
        <h3 className="text-white font-semibold">Receita x Despesas</h3>
        <p className="text-gray-500 text-sm mt-2">Dados financeiros serao exibidos apos sync do Nibo</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Receita x Despesas</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" />
            <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: "#1a1f2e",
                border: "1px solid #232a3b",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value) => formatCurrency(value as number)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#a3e635"
              fill="#a3e635"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="despesa"
              name="Despesas"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
      <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
        <h3 className="text-liv-ink font-semibold">Receita x Despesas</h3>
        <p className="text-liv-faint text-sm mt-2">Dados financeiros serao exibidos apos sync do Nibo</p>
      </div>
    );
  }

  return (
    <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
      <h3 className="text-liv-ink font-semibold mb-4">Receita x Despesas</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--liv-line))" />
            <XAxis dataKey="mes" tick={{ fill: "oklch(var(--liv-faint))", fontSize: 11 }} />
            <YAxis tick={{ fill: "oklch(var(--liv-faint))", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: "oklch(var(--liv-surface))",
                border: "1px solid oklch(var(--liv-line))",
                borderRadius: "8px",
                color: "oklch(var(--liv-ink))",
              }}
              formatter={(value) => formatCurrency(value as number)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="oklch(var(--liv-sage))"
              fill="oklch(var(--liv-sage))"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="despesa"
              name="Despesas"
              stroke="oklch(var(--liv-danger))"
              fill="oklch(var(--liv-danger))"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

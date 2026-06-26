"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface TrendPoint {
  date: string;
  igReach: number;
  igSeguidores: number;
  ytViews: number;
  leads: number;
}

export function SocialGrowthTrend({ trend }: { trend: TrendPoint[] }) {
  const formatted = trend.map((t) => ({
    ...t,
    dateLabel: t.date.slice(5),
  }));

  return (
    <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
      <h3 className="text-liv-ink font-semibold mb-1">Conteudo x Leads</h3>
      <p className="text-xs text-liv-faint mb-4">Correlacao entre alcance organico e geracao de leads</p>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--liv-line))" />
            <XAxis dataKey="dateLabel" tick={{ fill: "oklch(var(--liv-faint))", fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: "oklch(var(--liv-faint))", fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "oklch(var(--liv-faint))", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "oklch(var(--liv-surface))",
                border: "1px solid oklch(var(--liv-line))",
                borderRadius: "8px",
                color: "oklch(var(--liv-ink))",
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="igReach" name="Reach IG" stroke="oklch(var(--liv-violet))" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="ytViews" name="Views YT" stroke="oklch(var(--liv-danger))" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="oklch(var(--liv-sage))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

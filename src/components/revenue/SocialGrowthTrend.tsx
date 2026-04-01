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
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-1">Conteudo x Leads</h3>
      <p className="text-xs text-gray-500 mb-4">Correlacao entre alcance organico e geracao de leads</p>
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
            <Line yAxisId="left" type="monotone" dataKey="igReach" name="Reach IG" stroke="#d946ef" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="ytViews" name="Views YT" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="#a3e635" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

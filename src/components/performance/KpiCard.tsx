"use client";

import { formatCurrency } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | null;
  prefix?: string;
  color?: string;
}

export function KpiCard({
  label,
  value,
  prefix = "R$ ",
  color = "teal",
}: KpiCardProps) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-400/10", text: "text-blue-400" },
    green: { bg: "bg-lime-400/10", text: "text-lime-400" },
    teal: { bg: "bg-teal-400/10", text: "text-teal-400" },
    purple: { bg: "bg-purple-400/10", text: "text-purple-400" },
    red: { bg: "bg-red-400/10", text: "text-red-400" },
    amber: { bg: "bg-amber-400/10", text: "text-amber-400" },
    emerald: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
  };

  const c = colorMap[color] ?? colorMap.teal;

  const formattedValue =
    value === null
      ? null
      : prefix === "R$ "
        ? formatCurrency(value)
        : `${prefix}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-[#1a1f2e] rounded-xl p-4 shadow-sm border border-[#232a3b]">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {formattedValue !== null ? (
        <p className={`text-lg font-bold ${c.text}`}>{formattedValue}</p>
      ) : (
        <p className="text-lg font-bold text-gray-600">&mdash;</p>
      )}
    </div>
  );
}

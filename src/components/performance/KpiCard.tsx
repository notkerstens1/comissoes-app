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
    blue: { bg: "bg-liv-info/10", text: "text-liv-info" },
    green: { bg: "bg-liv-sage/10", text: "text-liv-sage" },
    teal: { bg: "bg-liv-teal/10", text: "text-liv-teal" },
    purple: { bg: "bg-liv-violet/10", text: "text-liv-violet" },
    red: { bg: "bg-liv-danger/10", text: "text-liv-danger" },
    amber: { bg: "bg-liv-gold/10", text: "text-liv-gold" },
    emerald: { bg: "bg-liv-sage/10", text: "text-liv-sage" },
  };

  const c = colorMap[color] ?? colorMap.teal;

  const formattedValue =
    value === null
      ? null
      : prefix === "R$ "
        ? formatCurrency(value)
        : `${prefix}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-liv-surface rounded-xl p-4 shadow-sm border border-liv-line">
      <p className="text-xs text-liv-muted mb-1">{label}</p>
      {formattedValue !== null ? (
        <p className={`text-lg font-bold ${c.text}`}>{formattedValue}</p>
      ) : (
        <p className="text-lg font-bold text-liv-faint">&mdash;</p>
      )}
    </div>
  );
}

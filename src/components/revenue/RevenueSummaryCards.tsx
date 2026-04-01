"use client";

import { DollarSign, Users, Target, TrendingUp, ShoppingCart, BarChart } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { isDiretor } from "@/lib/roles";

interface KPIs {
  gasto: number;
  cpl: number | null;
  cplQualificado: number | null;
  cac: number | null;
  ticketMedio?: number | null;
  roi?: number | null;
  receitaTotal?: number;
}

export function RevenueSummaryCards({ kpis, role }: { kpis: KPIs; role: string }) {
  const cards = [
    {
      label: "Investido",
      value: formatCurrency(kpis.gasto),
      icon: DollarSign,
      color: "text-red-400",
      visible: true,
    },
    {
      label: "CPL",
      value: kpis.cpl ? formatCurrency(kpis.cpl) : "—",
      icon: Users,
      color: "text-blue-400",
      visible: true,
    },
    {
      label: "CPL Qualificado",
      value: kpis.cplQualificado ? formatCurrency(kpis.cplQualificado) : "—",
      icon: Target,
      color: "text-purple-400",
      visible: true,
    },
    {
      label: "CAC",
      value: kpis.cac ? formatCurrency(kpis.cac) : "—",
      icon: ShoppingCart,
      color: "text-amber-400",
      visible: true,
    },
    {
      label: "Ticket Medio",
      value: kpis.ticketMedio ? formatCurrency(kpis.ticketMedio) : "—",
      icon: BarChart,
      color: "text-teal-400",
      visible: isDiretor(role),
    },
    {
      label: "ROI",
      value: kpis.roi != null ? `${kpis.roi.toFixed(0)}%` : "—",
      icon: TrendingUp,
      color: kpis.roi && kpis.roi > 0 ? "text-lime-400" : "text-red-400",
      visible: isDiretor(role),
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cards
        .filter((c) => c.visible)
        .map((card) => (
          <div
            key={card.label}
            className="flex-shrink-0 min-w-[140px] bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-gray-400">{card.label}</span>
            </div>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
    </div>
  );
}

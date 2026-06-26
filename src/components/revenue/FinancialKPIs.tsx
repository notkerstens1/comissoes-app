"use client";

import { DollarSign, TrendingUp, TrendingDown, Target, ShoppingCart, BarChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface KPIs {
  receitaTotal: number;
  custoEquipTotal: number;
  lucroLiquidoTotal: number;
  margemMedia: number;
  investimentoAds: number;
  cac: number | null;
  ticketMedio: number | null;
  roi: number | null;
  totalReceber: number;
  totalPagar: number;
  totalRecebido: number;
  totalPago: number;
  totalVencido: number;
}

export function FinancialKPIs({ kpis }: { kpis: KPIs }) {
  const cards = [
    { label: "Receita", value: formatCurrency(kpis.receitaTotal), icon: TrendingUp, color: "text-liv-sage" },
    { label: "Lucro Liquido", value: formatCurrency(kpis.lucroLiquidoTotal), icon: DollarSign, color: kpis.lucroLiquidoTotal > 0 ? "text-liv-sage" : "text-liv-danger" },
    { label: "Margem Media", value: `${kpis.margemMedia.toFixed(1)}%`, icon: BarChart, color: "text-liv-teal" },
    { label: "CAC", value: kpis.cac ? formatCurrency(kpis.cac) : "—", icon: ShoppingCart, color: "text-liv-gold" },
    { label: "Ticket Medio", value: kpis.ticketMedio ? formatCurrency(kpis.ticketMedio) : "—", icon: Target, color: "text-liv-info" },
    { label: "ROI", value: kpis.roi != null ? `${kpis.roi.toFixed(0)}%` : "—", icon: TrendingUp, color: kpis.roi && kpis.roi > 0 ? "text-liv-sage" : "text-liv-danger" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cards.map((card) => (
          <div key={card.label} className="flex-shrink-0 min-w-[140px] bg-liv-surface border border-liv-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-liv-muted">{card.label}</span>
            </div>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Resumo Contas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-liv-surface border border-liv-line rounded-xl p-4">
          <p className="text-xs text-liv-muted mb-1">A Receber</p>
          <p className="text-liv-sage font-bold">{formatCurrency(kpis.totalReceber)}</p>
          <p className="text-[10px] text-liv-faint mt-1">Recebido: {formatCurrency(kpis.totalRecebido)}</p>
        </div>
        <div className="bg-liv-surface border border-liv-line rounded-xl p-4">
          <p className="text-xs text-liv-muted mb-1">A Pagar</p>
          <p className="text-liv-danger font-bold">{formatCurrency(kpis.totalPagar)}</p>
          <p className="text-[10px] text-liv-faint mt-1">Pago: {formatCurrency(kpis.totalPago)}</p>
        </div>
        <div className="bg-liv-surface border border-liv-line rounded-xl p-4">
          <p className="text-xs text-liv-muted mb-1">Vencido</p>
          <p className={`font-bold ${kpis.totalVencido > 0 ? "text-liv-gold" : "text-liv-faint"}`}>
            {formatCurrency(kpis.totalVencido)}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ShoppingCart, DollarSign, TrendingUp, Zap, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VendorSummaryCardsProps {
  totalVendido: number;
  numVendas: number;
  ticketMedio: number;
  comissaoEstimada: {
    base: number;
    over: number;
    total: number;
  };
}

export function VendorSummaryCards({
  totalVendido,
  numVendas,
  ticketMedio,
  comissaoEstimada,
}: VendorSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-liv-info/10 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-liv-info" />
          </div>
          <span className="text-xs text-liv-faint uppercase tracking-wide">Total Vendido</span>
        </div>
        <p className="text-xl font-bold text-liv-ink tabular-nums">{formatCurrency(totalVendido)}</p>
      </div>

      <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-liv-violet/10 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-liv-violet" />
          </div>
          <span className="text-xs text-liv-faint uppercase tracking-wide">Vendas</span>
        </div>
        <p className="text-xl font-bold text-liv-ink tabular-nums">{numVendas}</p>
        <p className="text-xs text-liv-faint mt-1 tabular-nums">
          Ticket: {formatCurrency(ticketMedio)}
        </p>
      </div>

      <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-liv-sage/10 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-liv-sage" />
          </div>
          <span className="text-xs text-liv-faint uppercase tracking-wide">Comissao Base</span>
        </div>
        <p className="text-xl font-bold text-liv-sage tabular-nums">{formatCurrency(comissaoEstimada.base)}</p>
        <p className="text-xs text-liv-faint mt-1">2,5% sobre vendas</p>
      </div>

      <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-liv-sage/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-liv-sage" />
          </div>
          <span className="text-xs text-liv-faint uppercase tracking-wide">Comissao Over</span>
        </div>
        <p className="text-xl font-bold text-liv-sage tabular-nums">{formatCurrency(comissaoEstimada.over)}</p>
        <p className="text-xs text-liv-faint mt-1">Bonus por margem</p>
      </div>

      <div className="bg-liv-surface rounded-xl p-5 border border-liv-line ring-1 ring-liv-sage/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-liv-sage/15 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-liv-sage" />
          </div>
          <span className="text-xs font-medium text-liv-sage uppercase tracking-wide">Total</span>
        </div>
        <p className="text-xl font-bold text-liv-sage tabular-nums">{formatCurrency(comissaoEstimada.total)}</p>
        <p className="text-xs text-liv-sage mt-1">Comissao estimada</p>
      </div>
    </div>
  );
}

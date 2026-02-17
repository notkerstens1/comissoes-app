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
      <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-400/10 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Total Vendido</span>
        </div>
        <p className="text-xl font-bold text-gray-100">{formatCurrency(totalVendido)}</p>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-purple-400/10 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Vendas</span>
        </div>
        <p className="text-xl font-bold text-gray-100">{numVendas}</p>
        <p className="text-xs text-gray-500 mt-1">
          Ticket: {formatCurrency(ticketMedio)}
        </p>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-lime-400/10 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-lime-400" />
          </div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Comissao Base</span>
        </div>
        <p className="text-xl font-bold text-lime-400">{formatCurrency(comissaoEstimada.base)}</p>
        <p className="text-xs text-gray-500 mt-1">2,5% sobre vendas</p>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-400/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Comissao Over</span>
        </div>
        <p className="text-xl font-bold text-emerald-400">{formatCurrency(comissaoEstimada.over)}</p>
        <p className="text-xs text-gray-500 mt-1">Bonus por margem</p>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b] ring-2 ring-lime-400/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-lime-400/15 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-lime-400" />
          </div>
          <span className="text-xs font-medium text-lime-400 uppercase tracking-wide">Total</span>
        </div>
        <p className="text-xl font-bold text-lime-400">{formatCurrency(comissaoEstimada.total)}</p>
        <p className="text-xs text-lime-400 mt-1">Comissao estimada</p>
      </div>
    </div>
  );
}

"use client";

import { Target, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FaixaProgressBarProps {
  faixaAtual: {
    label: string;
    percentualOver: number;
  };
  proximaFaixa: {
    label: string;
    faltaValor: number;
  } | null;
  progressoFaixa: {
    volumeAtual: number;
    volumeMinFaixa: number;
    volumeMaxFaixa: number;
    percentual: number;
  } | null;
  totalVendidoMes: number;
}

export function FaixaProgressBar({
  faixaAtual,
  proximaFaixa,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  progressoFaixa,
  totalVendidoMes,
}: FaixaProgressBarProps) {
  // Faixas hardcoded para a visualizacao completa (igual ao dashboard anterior)
  const faixas = [
    { min: 0, max: 120000, label: "2,5% + 35% over", color: "bg-green-400" },
    { min: 120000, max: 170000, label: "2,5% + 45% over", color: "bg-green-500" },
    { min: 170000, max: 250000, label: "2,5% + 50% over", color: "bg-green-600" },
  ];

  const getProgressoVisual = () => {
    return faixas.map((f) => {
      const faixaSize = f.max - f.min;
      const preenchido = Math.min(Math.max(totalVendidoMes - f.min, 0), faixaSize);
      const percentual = (preenchido / faixaSize) * 100;
      return { ...f, percentual };
    });
  };

  return (
    <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-100">Progresso por Faixa</h2>
        </div>
        <span className="text-sm font-medium text-lime-400 bg-lime-400/10 px-3 py-1 rounded-full">
          {faixaAtual.label} ({(faixaAtual.percentualOver * 100).toFixed(0)}% over)
        </span>
      </div>

      {/* Barras de progresso */}
      <div className="space-y-3">
        {getProgressoVisual().map((faixa, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">
                {formatCurrency(faixa.min)} - {formatCurrency(faixa.max)}
              </span>
              <span className="font-medium text-gray-300">{faixa.label}</span>
            </div>
            <div className="h-3 bg-[#1a1f2e] rounded-full overflow-hidden">
              <div
                className={`h-full ${faixa.color} rounded-full transition-all duration-500`}
                style={{ width: `${faixa.percentual}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Proxima faixa */}
      {proximaFaixa && (
        <div className="mt-4 flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3">
          <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            Faltam <span className="font-bold">{formatCurrency(proximaFaixa.faltaValor)}</span>{" "}
            para atingir a {proximaFaixa.label}
          </p>
        </div>
      )}

      {/* Se ja esta na ultima faixa */}
      {!proximaFaixa && totalVendidoMes > 0 && (
        <div className="mt-4 flex items-center gap-2 bg-lime-400/10 border border-[#232a3b] rounded-lg px-4 py-3">
          <Target className="w-4 h-4 text-lime-400 flex-shrink-0" />
          <p className="text-sm text-lime-400 font-medium">
            Voce esta na faixa maxima! Continue vendendo!
          </p>
        </div>
      )}
    </div>
  );
}

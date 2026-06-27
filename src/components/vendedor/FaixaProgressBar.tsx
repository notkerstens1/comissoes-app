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
    { min: 0, max: 120000, label: "2,5% + 35% over", color: "bg-liv-sage" },
    { min: 120000, max: 170000, label: "2,5% + 45% over", color: "bg-liv-sage-deep" },
    { min: 170000, max: 250000, label: "2,5% + 50% over", color: "bg-liv-gold" },
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
    <div className="bg-liv-surface rounded-xl p-6 border border-liv-line">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-liv-muted" />
          <h2 className="font-semibold text-liv-ink">Progresso por Faixa</h2>
        </div>
        <span className="text-sm font-medium text-liv-sage bg-liv-sage/10 px-3 py-1 rounded-full">
          {faixaAtual.label} ({(faixaAtual.percentualOver * 100).toFixed(0)}% over)
        </span>
      </div>

      {/* Barras de progresso */}
      <div className="space-y-3">
        {getProgressoVisual().map((faixa, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-liv-muted tabular-nums">
                {formatCurrency(faixa.min)} - {formatCurrency(faixa.max)}
              </span>
              <span className="font-medium text-liv-ink">{faixa.label}</span>
            </div>
            <div className="h-3 bg-liv-bg rounded-full overflow-hidden">
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
        <div className="mt-4 flex items-center gap-2 bg-liv-gold/10 border border-liv-gold/20 rounded-lg px-4 py-3">
          <ChevronRight className="w-4 h-4 text-liv-gold flex-shrink-0" />
          <p className="text-sm text-liv-gold">
            Faltam <span className="font-bold tabular-nums">{formatCurrency(proximaFaixa.faltaValor)}</span>{" "}
            para atingir a {proximaFaixa.label}
          </p>
        </div>
      )}

      {/* Se ja esta na ultima faixa */}
      {!proximaFaixa && totalVendidoMes > 0 && (
        <div className="mt-4 flex items-center gap-2 bg-liv-sage/10 border border-liv-sage/20 rounded-lg px-4 py-3">
          <Target className="w-4 h-4 text-liv-sage flex-shrink-0" />
          <p className="text-sm text-liv-sage font-medium">
            Voce esta na faixa maxima! Continue vendendo!
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { VendaSemFonte } from "./types";

interface Props {
  totalVendas: number;
  classificadas: number;
  semFonte: number;
  percentualClassificadas: number;
  vendasSemFonte: VendaSemFonte[];
  onAbrirDetalhe: () => void;
}

export function QualidadeBanner({
  totalVendas,
  classificadas,
  semFonte,
  percentualClassificadas,
  vendasSemFonte,
  onAbrirDetalhe,
}: Props) {
  const tudoClassificado = semFonte === 0 && totalVendas > 0;
  const vazio = totalVendas === 0;

  const cor = tudoClassificado
    ? "border-liv-sage/30 bg-liv-sage/10 text-liv-sage"
    : percentualClassificadas >= 80
    ? "border-liv-gold/30 bg-liv-gold/10 text-liv-gold"
    : "border-liv-danger/30 bg-liv-danger/10 text-liv-danger";

  const Icon = tudoClassificado ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${cor}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div className="flex-1 text-sm">
        {vazio ? (
          <span className="opacity-80">Nenhuma venda no período selecionado.</span>
        ) : (
          <>
            <span className="font-medium">{totalVendas}</span> {totalVendas === 1 ? "venda" : "vendas"}
            {" · "}
            <span className="font-medium">{classificadas}</span> classificadas
            {" · "}
            <span className="font-medium">{semFonte}</span> sem fonte
            {totalVendas > 0 && (
              <span className="opacity-70 ml-2">
                ({percentualClassificadas.toFixed(0)}% classificadas)
              </span>
            )}
          </>
        )}
      </div>
      {vendasSemFonte.length > 0 && (
        <button
          onClick={onAbrirDetalhe}
          className="text-xs underline opacity-90 hover:opacity-100 shrink-0"
        >
          ver quais
        </button>
      )}
    </div>
  );
}

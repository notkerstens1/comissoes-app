"use client";

import { AlertTriangle } from "lucide-react";
import { CANAL_LABEL, type CanalKey } from "./types";

interface Props {
  exibir: boolean;
  canal: CanalKey | null;
  percentual: number;
}

export function AlertaConcentracao({ exibir, canal, percentual }: Props) {
  if (!exibir || !canal) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-liv-gold/30 bg-liv-gold/10 text-liv-gold">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium">
          {percentual.toFixed(0)}% da receita do período veio de{" "}
          <span className="font-bold">{CANAL_LABEL[canal]}</span>.
        </p>
        <p className="text-liv-gold/80 text-xs mt-0.5">
          Risco de concentração — se esse canal saturar, a receita cai junto. Vale planejar testes em outros canais.
        </p>
      </div>
    </div>
  );
}

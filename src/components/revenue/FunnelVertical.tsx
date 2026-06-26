"use client";

import { formatNumber, formatCurrency } from "@/lib/utils";

interface FunnelData {
  leads: number;
  qualificados: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  receita: number;
}

export function FunnelVertical({ funnel }: { funnel: FunnelData }) {
  const stages = [
    { label: "Leads", value: funnel.leads, color: "bg-liv-info" },
    { label: "Qualificados", value: funnel.qualificados, color: "bg-liv-violet" },
    { label: "Reunioes", value: funnel.reunioes, color: "bg-liv-gold" },
    { label: "Propostas", value: funnel.propostas, color: "bg-liv-teal" },
    { label: "Fechados", value: funnel.fechados, color: "bg-liv-sage" },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
      <h3 className="text-liv-ink font-semibold mb-4">Funil de Conversao</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const width = Math.max((stage.value / maxValue) * 100, 8);
          const prevValue = i > 0 ? stages[i - 1].value : 0;
          const convRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(0) : null;

          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-liv-muted">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-liv-ink">{formatNumber(stage.value)}</span>
                  {convRate && i > 0 && (
                    <span className="text-[10px] text-liv-faint">{convRate}%</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-liv-surface-2 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${stage.color} transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {funnel.receita > 0 && (
        <div className="mt-4 pt-3 border-t border-liv-line">
          <div className="flex justify-between items-center">
            <span className="text-xs text-liv-muted">Receita Total</span>
            <span className="text-liv-sage font-bold">{formatCurrency(funnel.receita)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

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
    { label: "Leads", value: funnel.leads, color: "bg-blue-500" },
    { label: "Qualificados", value: funnel.qualificados, color: "bg-purple-500" },
    { label: "Reunioes", value: funnel.reunioes, color: "bg-amber-500" },
    { label: "Propostas", value: funnel.propostas, color: "bg-teal-500" },
    { label: "Fechados", value: funnel.fechados, color: "bg-lime-500" },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Funil de Conversao</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const width = Math.max((stage.value / maxValue) * 100, 8);
          const prevValue = i > 0 ? stages[i - 1].value : 0;
          const convRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(0) : null;

          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{formatNumber(stage.value)}</span>
                  {convRate && i > 0 && (
                    <span className="text-[10px] text-gray-500">{convRate}%</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-[#0b0f19] rounded-full h-3">
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
        <div className="mt-4 pt-3 border-t border-[#232a3b]">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Receita Total</span>
            <span className="text-lime-400 font-bold">{formatCurrency(funnel.receita)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

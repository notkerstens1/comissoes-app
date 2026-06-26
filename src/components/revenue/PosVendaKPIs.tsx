"use client";

import { Package, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface KPIs {
  totalAtivos: number;
  concluidos: number;
  emTramite: number;
  aguardandoMaterial: number;
  emInstalacao: number;
  emVistoria: number;
  taxaConclusao: number;
}

export function PosVendaKPIs({ kpis }: { kpis: KPIs }) {
  const cards = [
    { label: "Em Tramite", value: kpis.emTramite, icon: Clock, color: "text-liv-info" },
    { label: "Aguard. Material", value: kpis.aguardandoMaterial, icon: Package, color: "text-liv-gold" },
    { label: "Em Instalacao", value: kpis.emInstalacao, icon: AlertTriangle, color: "text-liv-violet" },
    { label: "Concluidos (mes)", value: kpis.concluidos, icon: CheckCircle, color: "text-liv-sage" },
    { label: "Taxa Conclusao", value: `${kpis.taxaConclusao}%`, icon: CheckCircle, color: "text-liv-teal", isPercent: true },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cards.map((card) => (
        <div key={card.label} className="flex-shrink-0 min-w-[130px] bg-liv-surface border border-liv-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-xs text-liv-muted">{card.label}</span>
          </div>
          <p className={`text-xl font-bold ${card.color}`}>
            {typeof card.value === "number" ? card.value : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

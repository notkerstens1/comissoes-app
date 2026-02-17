"use client";

import { AlertTriangle } from "lucide-react";

interface VendorAlertsProps {
  alertas: string[];
}

export function VendorAlerts({ alertas }: VendorAlertsProps) {
  if (!alertas || alertas.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-amber-400">Alertas de Margem</h3>
      </div>
      <ul className="space-y-2">
        {alertas.map((alerta, i) => (
          <li key={i} className="text-sm text-amber-400 flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
            {alerta}
          </li>
        ))}
      </ul>
    </div>
  );
}

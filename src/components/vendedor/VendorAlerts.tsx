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
    <div className="bg-liv-gold/10 border border-liv-gold/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-liv-gold" />
        <h3 className="font-semibold text-liv-gold">Alertas de Margem</h3>
      </div>
      <ul className="space-y-2">
        {alertas.map((alerta, i) => (
          <li key={i} className="text-sm text-liv-gold flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 bg-liv-gold rounded-full flex-shrink-0" />
            {alerta}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { AlertTriangle, Info, XCircle } from "lucide-react";

interface Alert {
  tipo: string;
  mensagem: string;
  severidade: "info" | "warning" | "danger";
}

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (!alerts || alerts.length === 0) return null;

  const icons = {
    info: Info,
    warning: AlertTriangle,
    danger: XCircle,
  };

  const colors = {
    info: "bg-liv-info/10 border-liv-info/30 text-liv-info",
    warning: "bg-liv-gold/10 border-liv-gold/30 text-liv-gold",
    danger: "bg-liv-danger/10 border-liv-danger/30 text-liv-danger",
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const Icon = icons[alert.severidade];
        return (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[alert.severidade]}`}>
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm">{alert.mensagem}</span>
          </div>
        );
      })}
    </div>
  );
}

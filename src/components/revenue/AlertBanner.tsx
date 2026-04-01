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
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    danger: "bg-red-500/10 border-red-500/30 text-red-400",
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

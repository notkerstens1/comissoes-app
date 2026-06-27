"use client";

import { TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VendorForecastProps {
  forecast: {
    projecaoVendas: number;
    comissaoProjetada: number;
    diasRestantes: number;
    mediaDiaria: number;
  } | null;
}

export function VendorForecast({ forecast }: VendorForecastProps) {
  if (!forecast) {
    return null;
  }

  return (
    <div className="bg-liv-teal/5 rounded-xl p-6 border border-liv-teal/20">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-liv-teal" />
        <h2 className="font-semibold text-liv-ink">Projecao para o Mes</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-liv-teal uppercase tracking-wide mb-1">Projecao Vendas</p>
          <p className="text-lg font-bold text-liv-ink tabular-nums">{formatCurrency(forecast.projecaoVendas)}</p>
        </div>
        <div>
          <p className="text-xs text-liv-teal uppercase tracking-wide mb-1">Comissao Projetada</p>
          <p className="text-lg font-bold text-liv-ink tabular-nums">{formatCurrency(forecast.comissaoProjetada)}</p>
        </div>
        <div>
          <p className="text-xs text-liv-teal uppercase tracking-wide mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Dias Restantes
          </p>
          <p className="text-lg font-bold text-liv-ink tabular-nums">{forecast.diasRestantes} dias</p>
        </div>
        <div>
          <p className="text-xs text-liv-teal uppercase tracking-wide mb-1 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Media Diaria
          </p>
          <p className="text-lg font-bold text-liv-ink tabular-nums">{formatCurrency(forecast.mediaDiaria)}</p>
        </div>
      </div>

      <p className="text-xs text-liv-faint mt-4">
        * Projecao baseada na media diaria de vendas ate o momento.
      </p>
    </div>
  );
}

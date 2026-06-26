"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VendorBreakdownEntry {
  vendedorId: string;
  nome: string;
  atendidos: number;
  mql: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  valorEmVendas: number;
  leadsDescartados: number;
}

interface VendorDrilldownProps {
  vendorBreakdown: VendorBreakdownEntry[];
}

export function VendorDrilldown({ vendorBreakdown }: VendorDrilldownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totals = vendorBreakdown.reduce(
    (acc, v) => ({
      atendidos: acc.atendidos + v.atendidos,
      mql: acc.mql + v.mql,
      reunioes: acc.reunioes + v.reunioes,
      propostas: acc.propostas + v.propostas,
      fechados: acc.fechados + v.fechados,
      valorEmVendas: acc.valorEmVendas + v.valorEmVendas,
      leadsDescartados: acc.leadsDescartados + v.leadsDescartados,
    }),
    {
      atendidos: 0,
      mql: 0,
      reunioes: 0,
      propostas: 0,
      fechados: 0,
      valorEmVendas: 0,
      leadsDescartados: 0,
    }
  );

  return (
    <div className="bg-liv-surface rounded-xl border border-liv-line">
      {/* Header - toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-liv-surface-2 transition rounded-xl"
      >
        <h3 className="text-base font-semibold text-liv-ink">
          Detalhamento por Vendedor
        </h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-liv-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-liv-muted" />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-liv-line">
                <th className="text-left py-2 px-2 font-medium text-liv-muted">Vendedor</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">Atendidos</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">MQL</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">Reunioes</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">Propostas</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">Fechados</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">Valor Vendas</th>
                <th className="text-center py-2 px-1 font-medium text-liv-muted">Descartados</th>
              </tr>
            </thead>
            <tbody>
              {vendorBreakdown.map((vendor) => (
                <tr key={vendor.vendedorId} className="border-b border-liv-line">
                  <td className="py-2 px-2 text-liv-ink whitespace-nowrap">{vendor.nome}</td>
                  <td className="py-2 px-1 text-center text-liv-muted">{vendor.atendidos}</td>
                  <td className="py-2 px-1 text-center text-liv-muted">{vendor.mql}</td>
                  <td className="py-2 px-1 text-center text-liv-muted">{vendor.reunioes}</td>
                  <td className="py-2 px-1 text-center text-liv-muted">{vendor.propostas}</td>
                  <td className="py-2 px-1 text-center text-liv-muted">{vendor.fechados}</td>
                  <td className="py-2 px-1 text-center text-liv-muted">
                    {formatCurrency(vendor.valorEmVendas)}
                  </td>
                  <td className="py-2 px-1 text-center text-liv-muted">{vendor.leadsDescartados}</td>
                </tr>
              ))}

              {/* Total row */}
              <tr className="border-t-2 border-liv-muted bg-liv-surface-2">
                <td className="py-2 px-2 font-bold text-liv-ink">Total</td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">{totals.atendidos}</td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">{totals.mql}</td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">{totals.reunioes}</td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">{totals.propostas}</td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">{totals.fechados}</td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">
                  {formatCurrency(totals.valorEmVendas)}
                </td>
                <td className="py-2 px-1 text-center font-bold text-liv-ink">{totals.leadsDescartados}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

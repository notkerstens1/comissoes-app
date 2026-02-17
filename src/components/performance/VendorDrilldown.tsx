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
    <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b]">
      {/* Header - toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#232a3b] transition rounded-xl"
      >
        <h3 className="text-base font-semibold text-gray-100">
          Detalhamento por Vendedor
        </h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#232a3b]">
                <th className="text-left py-2 px-2 font-medium text-gray-400">Vendedor</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">Atendidos</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">MQL</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">Reunioes</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">Propostas</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">Fechados</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">Valor Vendas</th>
                <th className="text-center py-2 px-1 font-medium text-gray-400">Descartados</th>
              </tr>
            </thead>
            <tbody>
              {vendorBreakdown.map((vendor) => (
                <tr key={vendor.vendedorId} className="border-b border-[#232a3b]">
                  <td className="py-2 px-2 text-gray-100 whitespace-nowrap">{vendor.nome}</td>
                  <td className="py-2 px-1 text-center text-gray-300">{vendor.atendidos}</td>
                  <td className="py-2 px-1 text-center text-gray-300">{vendor.mql}</td>
                  <td className="py-2 px-1 text-center text-gray-300">{vendor.reunioes}</td>
                  <td className="py-2 px-1 text-center text-gray-300">{vendor.propostas}</td>
                  <td className="py-2 px-1 text-center text-gray-300">{vendor.fechados}</td>
                  <td className="py-2 px-1 text-center text-gray-300">
                    {formatCurrency(vendor.valorEmVendas)}
                  </td>
                  <td className="py-2 px-1 text-center text-gray-300">{vendor.leadsDescartados}</td>
                </tr>
              ))}

              {/* Total row */}
              <tr className="border-t-2 border-gray-600 bg-[#141820]">
                <td className="py-2 px-2 font-bold text-gray-100">Total</td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">{totals.atendidos}</td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">{totals.mql}</td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">{totals.reunioes}</td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">{totals.propostas}</td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">{totals.fechados}</td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">
                  {formatCurrency(totals.valorEmVendas)}
                </td>
                <td className="py-2 px-1 text-center font-bold text-gray-100">{totals.leadsDescartados}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

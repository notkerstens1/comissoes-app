"use client";

import { useState, useEffect, useRef } from "react";
import { BarChart3 } from "lucide-react";
import {
  formatCurrency,
  formatCurrencyInput,
  handleCurrencyKeyInput,
} from "@/lib/utils";

interface VendorCommercial {
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

interface CommercialTableProps {
  vendors: VendorCommercial[];
  onChange: (vendors: VendorCommercial[]) => void;
  readOnly: boolean;
}

const intColumns = [
  { key: "atendidos", label: "Atendidos" },
  { key: "mql", label: "MQL" },
  { key: "reunioes", label: "Reunioes" },
  { key: "propostas", label: "Propostas" },
  { key: "fechados", label: "Fechados" },
] as const;

type IntKey = (typeof intColumns)[number]["key"];

const inputStyle =
  "px-2 py-1 text-sm rounded border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-1 focus:ring-liv-teal focus:border-liv-teal outline-none";

export function CommercialTable({ vendors, onChange, readOnly }: CommercialTableProps) {
  // Local display state for each vendor's currency field
  const [currencyDisplays, setCurrencyDisplays] = useState<Record<string, string>>({});
  const skipSync = useRef(false);

  // Initialize currency display values when vendors change externally (data load)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    const displays: Record<string, string> = {};
    for (const v of vendors) {
      displays[v.vendedorId] = formatCurrencyInput(v.valorEmVendas);
    }
    setCurrencyDisplays(displays);
  }, [vendors]);

  const handleIntChange = (vendedorId: string, field: IntKey, value: string) => {
    const num = parseInt(value, 10) || 0;
    const updated = vendors.map((v) =>
      v.vendedorId === vendedorId ? { ...v, [field]: Math.max(0, num) } : v
    );
    skipSync.current = true;
    onChange(updated);
  };

  const handleDescartadosChange = (vendedorId: string, value: string) => {
    const num = parseInt(value, 10) || 0;
    const updated = vendors.map((v) =>
      v.vendedorId === vendedorId ? { ...v, leadsDescartados: Math.max(0, num) } : v
    );
    skipSync.current = true;
    onChange(updated);
  };

  const handleCurrencyChange = (vendedorId: string, rawValue: string) => {
    if (rawValue === "") {
      setCurrencyDisplays((prev) => ({ ...prev, [vendedorId]: "" }));
      const updated = vendors.map((v) =>
        v.vendedorId === vendedorId ? { ...v, valorEmVendas: 0 } : v
      );
      skipSync.current = true;
      onChange(updated);
      return;
    }
    const { display, numericValue } = handleCurrencyKeyInput(rawValue);
    setCurrencyDisplays((prev) => ({ ...prev, [vendedorId]: display }));
    const updated = vendors.map((v) =>
      v.vendedorId === vendedorId ? { ...v, valorEmVendas: numericValue } : v
    );
    skipSync.current = true;
    onChange(updated);
  };

  // Calculate totals
  const totals = vendors.reduce(
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-liv-teal" />
        <h3 className="text-base font-semibold text-liv-ink">Comercial do Dia</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-liv-line">
              <th className="text-left py-2 px-2 font-medium text-liv-muted">Vendedor</th>
              {intColumns.map((col) => (
                <th key={col.key} className="text-center py-2 px-1 font-medium text-liv-muted">
                  {col.label}
                </th>
              ))}
              <th className="text-center py-2 px-1 font-medium text-liv-muted">Valor Vendas</th>
              <th className="text-center py-2 px-1 font-medium text-liv-muted">Descartados</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.vendedorId} className="border-b border-liv-line">
                <td className="py-2 px-2 text-liv-ink whitespace-nowrap">{vendor.nome}</td>
                {intColumns.map((col) => (
                  <td key={col.key} className="py-2 px-1 text-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={vendor[col.key] || ""}
                      onChange={(e) => handleIntChange(vendor.vendedorId, col.key, e.target.value)}
                      disabled={readOnly}
                      className={`w-16 text-center ${inputStyle} ${readOnly ? "bg-liv-surface" : ""}`}
                    />
                  </td>
                ))}
                <td className="py-2 px-1 text-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={currencyDisplays[vendor.vendedorId] ?? ""}
                    onChange={(e) => handleCurrencyChange(vendor.vendedorId, e.target.value)}
                    disabled={readOnly}
                    className={`w-24 text-center ${inputStyle} ${readOnly ? "bg-liv-surface" : ""}`}
                    placeholder="0,00"
                    autoComplete="off"
                  />
                </td>
                <td className="py-2 px-1 text-center">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={vendor.leadsDescartados || ""}
                    onChange={(e) => handleDescartadosChange(vendor.vendedorId, e.target.value)}
                    disabled={readOnly}
                    className={`w-16 text-center ${inputStyle} ${readOnly ? "bg-liv-surface" : ""}`}
                  />
                </td>
              </tr>
            ))}

            {/* Total row */}
            <tr className="border-t-2 border-liv-muted bg-liv-surface">
              <td className="py-2 px-2 font-bold text-liv-ink">Total do time</td>
              {intColumns.map((col) => (
                <td key={col.key} className="py-2 px-1 text-center font-bold text-liv-ink">
                  {totals[col.key]}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-bold text-liv-ink">
                {formatCurrency(totals.valorEmVendas)}
              </td>
              <td className="py-2 px-1 text-center font-bold text-liv-ink">
                {totals.leadsDescartados}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

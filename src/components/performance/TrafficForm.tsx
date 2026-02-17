"use client";

import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { handleCurrencyKeyInput, formatCurrencyInput } from "@/lib/utils";

interface TrafficData {
  pessoasAlcancadas: number;
  totalLeads: number;
  valorInvestidoVendas: number;
  valorInvestidoBranding: number;
  valorGasto: number;
}

interface TrafficFormProps {
  data: TrafficData;
  onChange: (data: TrafficData) => void;
  readOnly: boolean;
}

export function TrafficForm({ data, onChange, readOnly }: TrafficFormProps) {
  const [displayInvestVendas, setDisplayInvestVendas] = useState("");
  const [displayInvestBranding, setDisplayInvestBranding] = useState("");
  const [displayValorGasto, setDisplayValorGasto] = useState("");

  // Initialize display values from data prop
  useEffect(() => {
    setDisplayInvestVendas(formatCurrencyInput(data.valorInvestidoVendas));
    setDisplayInvestBranding(formatCurrencyInput(data.valorInvestidoBranding));
    setDisplayValorGasto(formatCurrencyInput(data.valorGasto));
  }, [data.valorInvestidoVendas, data.valorInvestidoBranding, data.valorGasto]);

  const handleIntChange = (field: "pessoasAlcancadas" | "totalLeads", value: string) => {
    const num = parseInt(value, 10) || 0;
    onChange({ ...data, [field]: Math.max(0, num) });
  };

  const handleCurrencyChange = (
    field: "valorInvestidoVendas" | "valorInvestidoBranding" | "valorGasto",
    rawValue: string,
    setDisplay: (v: string) => void
  ) => {
    if (rawValue === "") {
      setDisplay("");
      onChange({ ...data, [field]: 0 });
      return;
    }
    const { display, numericValue } = handleCurrencyKeyInput(rawValue);
    setDisplay(display);
    onChange({ ...data, [field]: numericValue });
  };

  const inputBase =
    "w-full px-3 py-2 text-sm rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cloud className="w-5 h-5 text-teal-400" />
        <h3 className="text-base font-semibold text-gray-100">Trafego do Dia</h3>
        {readOnly && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-400/10 text-yellow-400">
            Somente visualizacao
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pessoas alcancadas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Pessoas alcancadas
          </label>
          <input
            type="number"
            min={0}
            value={data.pessoasAlcancadas || ""}
            onChange={(e) => handleIntChange("pessoasAlcancadas", e.target.value)}
            disabled={readOnly}
            className={`${inputBase} ${readOnly ? "bg-[#1a1f2e]" : ""}`}
            placeholder="0"
          />
        </div>

        {/* Total de leads */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Total de leads
          </label>
          <input
            type="number"
            min={0}
            value={data.totalLeads || ""}
            onChange={(e) => handleIntChange("totalLeads", e.target.value)}
            disabled={readOnly}
            className={`${inputBase} ${readOnly ? "bg-[#1a1f2e]" : ""}`}
            placeholder="0"
          />
        </div>

        {/* Investimento em vendas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Investimento em vendas (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={displayInvestVendas}
            onChange={(e) =>
              handleCurrencyChange("valorInvestidoVendas", e.target.value, setDisplayInvestVendas)
            }
            disabled={readOnly}
            className={`${inputBase} ${readOnly ? "bg-[#1a1f2e]" : ""}`}
            placeholder="0,00"
            autoComplete="off"
          />
        </div>

        {/* Investimento em branding */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Investimento em branding (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={displayInvestBranding}
            onChange={(e) =>
              handleCurrencyChange("valorInvestidoBranding", e.target.value, setDisplayInvestBranding)
            }
            disabled={readOnly}
            className={`${inputBase} ${readOnly ? "bg-[#1a1f2e]" : ""}`}
            placeholder="0,00"
            autoComplete="off"
          />
        </div>

        {/* Valor gasto */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Valor gasto (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={displayValorGasto}
            onChange={(e) =>
              handleCurrencyChange("valorGasto", e.target.value, setDisplayValorGasto)
            }
            disabled={readOnly}
            className={`${inputBase} ${readOnly ? "bg-[#1a1f2e]" : ""}`}
            placeholder="0,00"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

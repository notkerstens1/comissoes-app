"use client";

import { cn } from "@/lib/utils";

interface InvestmentToggleProps {
  type: "vendas" | "total";
  onChange: (type: "vendas" | "total") => void;
}

const options: { value: "vendas" | "total"; label: string }[] = [
  { value: "vendas", label: "Invest. Vendas" },
  { value: "total", label: "Invest. Total" },
];

export function InvestmentToggle({ type, onChange }: InvestmentToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-[#1a1f2e] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition",
            type === opt.value
              ? "bg-teal-400 text-gray-900"
              : "bg-[#1a1f2e] text-gray-400 hover:bg-[#232a3b]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

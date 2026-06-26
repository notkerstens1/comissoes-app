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
    <div className="inline-flex rounded-full bg-liv-surface p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition",
            type === opt.value
              ? "bg-liv-teal text-liv-bg"
              : "bg-liv-surface text-liv-muted hover:bg-liv-surface-2"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

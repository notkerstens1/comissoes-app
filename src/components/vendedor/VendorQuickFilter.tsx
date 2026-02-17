"use client";

interface VendorQuickFilterProps {
  periodo: "semana" | "mes";
  onChange: (periodo: "semana" | "mes") => void;
}

export function VendorQuickFilter({ periodo, onChange }: VendorQuickFilterProps) {
  return (
    <div className="inline-flex rounded-lg border border-[#232a3b] bg-[#1a1f2e] p-1">
      <button
        onClick={() => onChange("semana")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          periodo === "semana"
            ? "bg-lime-400 text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-100"
        }`}
      >
        Semana
      </button>
      <button
        onClick={() => onChange("mes")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          periodo === "mes"
            ? "bg-lime-400 text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-100"
        }`}
      >
        Mes
      </button>
    </div>
  );
}

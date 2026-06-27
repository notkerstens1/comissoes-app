"use client";

interface VendorQuickFilterProps {
  periodo: "semana" | "mes";
  onChange: (periodo: "semana" | "mes") => void;
}

export function VendorQuickFilter({ periodo, onChange }: VendorQuickFilterProps) {
  return (
    <div className="inline-flex rounded-lg border border-liv-line bg-liv-surface p-1">
      <button
        onClick={() => onChange("semana")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          periodo === "semana"
            ? "bg-liv-sage text-liv-bg shadow-sm"
            : "text-liv-muted hover:text-liv-ink"
        }`}
      >
        Semana
      </button>
      <button
        onClick={() => onChange("mes")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          periodo === "mes"
            ? "bg-liv-sage text-liv-bg shadow-sm"
            : "text-liv-muted hover:text-liv-ink"
        }`}
      >
        Mes
      </button>
    </div>
  );
}

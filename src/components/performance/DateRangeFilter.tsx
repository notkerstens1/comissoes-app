"use client";

import { cn } from "@/lib/utils";

type Preset = "current_week" | "7d" | "30d" | "current_month" | "custom";

interface DateRangeFilterProps {
  preset: Preset;
  startDate: string;
  endDate: string;
  label: string;
  onPresetChange: (preset: Preset) => void;
  onCustomRangeChange: (start: string, end: string) => void;
}

const presets: { value: Preset; label: string }[] = [
  { value: "current_week", label: "Semana atual" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "current_month", label: "Mes atual" },
  { value: "custom", label: "Personalizado" },
];

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  label,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition",
              preset === p.value
                ? "bg-teal-400 text-gray-900"
                : "bg-[#1a1f2e] text-gray-400 hover:bg-[#232a3b]"
            )}
          >
            {p.label}
          </button>
        ))}

        {preset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onCustomRangeChange(e.target.value, endDate)}
              className="px-3 py-1.5 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 text-sm"
            />
            <span className="text-gray-500 text-sm">ate</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onCustomRangeChange(startDate, e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 text-sm"
            />
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { DatePreset } from "@/lib/dates";

// Re-export para conveniencia dos consumidores
export type { DatePreset };

interface DateRangeFilterProps {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  label: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomRangeChange: (start: string, end: string) => void;
  presets?: DatePreset[];
}

const presetLabels: Record<DatePreset, string> = {
  current_week: "Semana atual",
  "7d": "7 dias",
  "30d": "30 dias",
  current_month: "Mes atual",
  last_month: "Mes passado",
  custom: "Personalizado",
};

const defaultPresets: DatePreset[] = ["current_week", "7d", "30d", "current_month", "custom"];

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  label,
  onPresetChange,
  onCustomRangeChange,
  presets: presetList = defaultPresets,
}: DateRangeFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {presetList.map((p) => (
          <button
            key={p}
            onClick={() => onPresetChange(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition",
              preset === p
                ? "bg-teal-400 text-gray-900"
                : "bg-[#1a1f2e] text-gray-400 hover:bg-[#232a3b]"
            )}
          >
            {presetLabels[p]}
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

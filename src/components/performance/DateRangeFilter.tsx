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
  // Seletor de mes (opcional): quando informado e o preset "month" estiver ativo,
  // renderiza um dropdown de meses em vez do range de datas.
  monthOptions?: { value: string; label: string }[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

const presetLabels: Record<DatePreset, string> = {
  current_week: "Semana atual",
  "7d": "7 dias",
  "30d": "30 dias",
  current_month: "Mes atual",
  last_month: "Mes passado",
  month: "Mes",
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
  monthOptions,
  selectedMonth,
  onMonthChange,
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
                ? "bg-liv-teal text-liv-bg"
                : "bg-liv-surface text-liv-muted hover:bg-liv-surface-2"
            )}
          >
            {presetLabels[p]}
          </button>
        ))}

        {preset === "month" && monthOptions && onMonthChange && (
          <select
            value={selectedMonth ?? ""}
            onChange={(e) => onMonthChange(e.target.value)}
            className="ml-2 px-3 py-1.5 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        {preset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onCustomRangeChange(e.target.value, endDate)}
              className="px-3 py-1.5 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm"
            />
            <span className="text-liv-faint text-sm">ate</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onCustomRangeChange(startDate, e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm"
            />
          </div>
        )}
      </div>

      <p className="text-sm text-liv-muted">{label}</p>
    </div>
  );
}

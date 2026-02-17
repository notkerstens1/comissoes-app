"use client";

import { parseISO, getDay, format } from "date-fns";
import { cn } from "@/lib/utils";

interface CompletenessCalendarProps {
  completeness: Array<{
    date: string;
    hasTraffic: boolean;
    hasCommercial: boolean;
    status: string;
  }>;
  onDayClick: (date: string) => void;
}

const weekDayHeaders = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const statusStyles: Record<string, string> = {
  completo: "bg-lime-400/15 border-lime-400/30 text-lime-400",
  falta_trafego: "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
  falta_comercial: "bg-orange-400/10 border-orange-400/30 text-orange-400",
  vazio: "bg-red-400/10 border-red-400/20 text-red-400",
};

const legendItems = [
  { status: "completo", label: "Completo", color: "bg-lime-400" },
  { status: "falta_trafego", label: "Falta trafego", color: "bg-yellow-400" },
  { status: "falta_comercial", label: "Falta comercial", color: "bg-orange-400" },
  { status: "vazio", label: "Vazio", color: "bg-red-400" },
];

export function CompletenessCalendar({
  completeness,
  onDayClick,
}: CompletenessCalendarProps) {
  // Build the calendar grid
  const cells: Array<{ date: string; day: number; status: string } | null> = [];

  if (completeness.length > 0) {
    const firstDate = parseISO(completeness[0].date);
    const startDayOfWeek = getDay(firstDate); // 0 = Sunday

    // Add empty cells to align the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(null);
    }

    // Add each day
    for (const entry of completeness) {
      const parsed = parseISO(entry.date);
      cells.push({
        date: entry.date,
        day: parseInt(format(parsed, "d"), 10),
        status: entry.status,
      });
    }
  }

  // Split cells into rows of 7 (weeks)
  const weeks: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    // Pad the last week with nulls if needed
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">
        Completude do Diario
      </h3>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDayHeaders.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, idx) =>
          cell ? (
            <button
              key={cell.date}
              onClick={() => onDayClick(cell.date)}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg border text-sm font-medium transition hover:opacity-80",
                statusStyles[cell.status] || statusStyles.vazio
              )}
            >
              {cell.day}
            </button>
          ) : (
            <div key={`empty-${idx}`} className="aspect-square" />
          )
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[#232a3b]">
        {legendItems.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span
              className={cn("w-2.5 h-2.5 rounded-full", item.color)}
            />
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

type Preset = "7d" | "30d" | "90d" | "custom";

interface Props {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const presets: { value: Preset; label: string; days: number }[] = [
  { value: "7d", label: "7 dias", days: 7 },
  { value: "30d", label: "30 dias", days: 30 },
  { value: "90d", label: "90 dias", days: 90 },
];

export function RevenueDateFilter({ startDate, endDate, onChange }: Props) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (p: Preset, days: number) => {
    setPreset(p);
    setShowCustom(false);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onChange(start.toISOString().split("T")[0], end.toISOString().split("T")[0]);
  };

  return (
    <div className="flex items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => handlePreset(p.value, p.days)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            preset === p.value && !showCustom
              ? "bg-liv-sage/10 text-liv-sage border border-liv-sage/30"
              : "text-liv-muted hover:text-liv-ink bg-liv-surface border border-liv-line"
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => { setShowCustom(!showCustom); setPreset("custom"); }}
        className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
          showCustom
            ? "bg-liv-sage/10 text-liv-sage border border-liv-sage/30"
            : "text-liv-muted hover:text-liv-ink bg-liv-surface border border-liv-line"
        }`}
      >
        <Calendar className="w-4 h-4" />
      </button>
      {showCustom && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            className="bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-xs text-liv-ink"
          />
          <span className="text-liv-faint text-xs">a</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChange(startDate, e.target.value)}
            className="bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-xs text-liv-ink"
          />
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "accent" | "positive" | "negative";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
  highlight?: boolean;
  meta?: React.ReactNode;
  chart?: React.ReactNode;
  className?: string;
}

const valueTone: Record<StatTone, string> = {
  default: "text-liv-ink",
  accent: "text-liv-sage",
  positive: "text-liv-sage",
  negative: "text-liv-danger",
};

export function StatCard({ label, value, tone = "default", highlight, meta, chart, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-liv-surface p-5",
        highlight ? "border-liv-danger/30" : "border-liv-line",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">{label}</p>
        {chart}
      </div>
      <p className={cn("mt-2 text-[1.75rem] font-bold leading-tight tracking-tight tabular-nums", valueTone[tone])}>
        {value}
      </p>
      {meta && <p className="mt-1 text-xs text-liv-faint">{meta}</p>}
    </div>
  );
}

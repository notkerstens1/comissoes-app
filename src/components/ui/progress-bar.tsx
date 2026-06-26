import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressTone = "sage" | "amber" | "gold";

interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

const fillClasses: Record<ProgressTone, string> = {
  sage: "bg-liv-sage",
  amber: "bg-liv-gold/80",
  gold: "bg-liv-gold",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "sage",
  height = 8,
  showLabel,
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-liv-faint">Meta</span>
          <span className="font-bold tabular-nums text-liv-muted">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="overflow-hidden rounded-full bg-liv-surface-2"
        style={{ height }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            fillClasses[tone]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

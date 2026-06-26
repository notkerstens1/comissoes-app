"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> { value: T; label: string }

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={cn("relative inline-flex rounded-full border border-liv-line bg-liv-surface-2 p-0.5", className)}>
      <span
        aria-hidden
        className="absolute inset-y-0.5 rounded-full bg-liv-sage transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            o.value === value ? "text-liv-bg" : "text-liv-muted hover:text-liv-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

const prefersReduce = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, durationMs = 900, prefix = "", suffix = "", decimals = 0, className }: CountUpProps) {
  const [n, setN] = React.useState(value); // valor final primeiro (fallback seguro)

  React.useEffect(() => {
    if (prefersReduce()) { setN(value); return; }
    let raf = 0;
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      setN(value * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else setN(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const fmt = n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={cn("tabular-nums", className)}>{prefix}{fmt}{suffix}</span>;
}

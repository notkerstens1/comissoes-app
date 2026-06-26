"use client";

import * as React from "react";

const COLORS = ["oklch(var(--liv-sage))", "oklch(var(--liv-gold))", "oklch(var(--liv-sand))"];

export function Confetti({ burstKey }: { burstKey: number }) {
  const pieces = React.useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({
      left: (i * 37) % 100,
      dur: 1.1 + ((i * 13) % 12) / 10,
      delay: ((i * 7) % 30) / 100,
      col: COLORS[i % COLORS.length],
      rot: (i * 53) % 360,
      w: 6 + (i % 6),
      h: 9 + (i % 8),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burstKey],
  );
  if (!burstKey) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden" key={burstKey}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`, width: p.w, height: p.h, background: p.col,
            transform: `rotate(${p.rot}deg)`,
            animation: `liv-confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

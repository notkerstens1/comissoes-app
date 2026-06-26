"use client";

import * as React from "react";

interface RevealProps {
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}

const EASE = "cubic-bezier(.22,1,.36,1)";

export function Reveal({ delayMs = 0, className, children }: RevealProps) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setOn(true), 20 + delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);
  return (
    <div
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : "translateY(10px)",
        transition: `opacity 340ms ${EASE}, transform 340ms ${EASE}`,
      }}
    >
      {children}
    </div>
  );
}

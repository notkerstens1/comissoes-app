import * as React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
  strokeWidth?: number;
}

let gidCounter = 0;

export function Sparkline({ data, width = 120, height = 30, color = "oklch(var(--liv-sage))", area = true, strokeWidth = 2 }: SparklineProps) {
  const gid = React.useMemo(() => `spk${++gidCounter}`, []);
  if (!data || data.length < 2) return null;

  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const xs = (i: number) => (i / (data.length - 1)) * (width - pad * 2) + pad;
  const ys = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const pts = data.map((v, i) => [xs(i), ys(v)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const areaD = `${line} L ${(width - pad).toFixed(1)} ${height - pad} L ${pad} ${height - pad} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={areaD} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} style={{ animation: "liv-pulse-dot 1.6s ease-in-out infinite" }} />
    </svg>
  );
}

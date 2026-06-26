"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CountUp } from "@/components/ui/count-up";
import type { RankedVendedor } from "@/lib/ranking";
import { cn } from "@/lib/utils";

function PodiumCard({ p, big }: { p: RankedVendedor; big?: boolean }) {
  const first = p.posicao === 1;
  const done = p.progresso >= 1;
  return (
    <div className={cn(
      "flex flex-col items-center gap-2 rounded-2xl border bg-liv-surface p-5 text-center",
      first ? "border-liv-gold/30 shadow-[var(--glow-gold)]" : "border-liv-line",
      first && "sm:scale-105",
    )}>
      <Avatar name={p.nome} rank={p.posicao} tone={first ? "gold" : "neutral"} size={first ? (big ? 84 : 60) : (big ? 68 : 50)} />
      <div className={cn("font-bold text-liv-ink", big ? "text-lg" : "text-base")}>{p.nome}</div>
      <div className={cn("font-bold tabular-nums", done ? "text-liv-gold" : "text-liv-sage", big ? "text-2xl" : "text-xl")}>
        <CountUp value={p.totalVendido} prefix="R$ " durationMs={700} />
      </div>
      {done && <Badge variant="gold">Meta batida</Badge>}
      <div className="w-full">
        <ProgressBar value={p.progresso * 100} max={100} tone={done ? "gold" : "amber"} height={big ? 10 : 7} showLabel />
      </div>
    </div>
  );
}

export function Podium({ top3, big }: { top3: RankedVendedor[]; big?: boolean }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as RankedVendedor[];
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {order.map((p) => <PodiumCard key={p.id} p={p} big={big} />)}
    </div>
  );
}

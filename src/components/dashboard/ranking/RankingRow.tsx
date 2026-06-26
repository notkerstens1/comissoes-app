"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CountUp } from "@/components/ui/count-up";
import type { RankedVendedor } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export function RankingRow({ v, big }: { v: RankedVendedor; big?: boolean }) {
  const done = v.progresso >= 1;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-liv-line bg-liv-surface px-4 py-3.5">
      <span className="w-6 text-center text-sm font-bold tabular-nums text-liv-faint">{v.posicao}</span>
      <Avatar name={v.nome} rank={v.posicao} size={big ? 46 : 38} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-bold text-liv-ink", big ? "text-lg" : "text-base")}>{v.nome}</span>
          {done && <Badge variant="gold">Meta</Badge>}
        </div>
        <div className="mt-0.5 text-xs text-liv-faint">{v.qtdVendas} vendas</div>
      </div>
      <div className={cn(big ? "w-56" : "w-36", "shrink-0")}>
        <ProgressBar value={v.progresso * 100} max={100} tone={done ? "gold" : "amber"} height={big ? 9 : 6} />
      </div>
      <div className={cn("shrink-0 text-right font-bold tabular-nums", done ? "text-liv-gold" : "text-liv-sage", big ? "text-xl" : "text-lg")}>
        <CountUp value={v.totalVendido} prefix="R$ " durationMs={700} />
      </div>
    </div>
  );
}

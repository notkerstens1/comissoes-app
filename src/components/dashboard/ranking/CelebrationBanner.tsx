"use client";

import * as React from "react";
import { Trophy, TrendingUp } from "lucide-react";
import type { LiveEvent } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export function CelebrationBanner({ event }: { event: LiveEvent | null }) {
  if (!event || event.kind === "sale") return null;
  const lead = event.kind === "lead";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold",
        lead ? "border-liv-sage/40 bg-liv-sage/12 text-liv-sage" : "border-liv-gold/40 bg-liv-gold/12 text-liv-gold",
      )}
    >
      {lead ? <Trophy className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
      <span>{lead ? `${event.nome} assumiu o 1º lugar!` : `${event.nome} bateu a meta!`}</span>
      <span className="ml-1 text-xs font-medium opacity-80">{lead ? "Novo líder do ranking" : "100% da meta do mês"}</span>
    </div>
  );
}

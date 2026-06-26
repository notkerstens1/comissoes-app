"use client";

import * as React from "react";
import { ShoppingCart, Trophy, TrendingUp } from "lucide-react";
import type { LiveEvent } from "@/lib/ranking";
import { formatCurrency } from "@/lib/utils";

export interface ToastItem extends LiveEvent { toastId: number }

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {items.map((t, i) => {
        const Icon = t.kind === "lead" ? Trophy : t.kind === "meta" ? TrendingUp : ShoppingCart;
        const msg = t.kind === "lead" ? " é o novo líder!" : t.kind === "meta" ? " bateu a meta!" : ` registrou ${formatCurrency(t.delta)}`;
        return (
          <div key={t.toastId ?? i} className="liv-rise flex items-center gap-2 rounded-xl border border-liv-line bg-liv-surface px-4 py-2.5 text-sm text-liv-ink shadow-lg">
            <Icon className="h-4 w-4 text-liv-sage" />
            <span><b>{t.nome}</b>{msg}</span>
          </div>
        );
      })}
    </div>
  );
}

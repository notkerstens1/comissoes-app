"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveRanking } from "./use-live-ranking";
import { Podium } from "./ranking/Podium";
import { RankingRow } from "./ranking/RankingRow";
import { Confetti } from "./ranking/Confetti";
import { CelebrationBanner } from "./ranking/CelebrationBanner";
import { Toasts, type ToastItem } from "./ranking/Toasts";
import type { LiveEvent } from "@/lib/ranking";

interface LiveRankingProps {
  inicio: string;
  fim: string;
  telao?: boolean;
  demo?: boolean;
  onOpenTelao?: () => void;
}

let toastSeq = 0;

export function LiveRanking({ inicio, fim, telao, demo, onOpenTelao }: LiveRankingProps) {
  const { ranking, events, loading, consume } = useLiveRanking({ inicio, fim, alwaysOn: telao });
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [banner, setBanner] = React.useState<LiveEvent | null>(null);
  const [burst, setBurst] = React.useState(0);

  // reage à fila de eventos do hook
  React.useEffect(() => {
    if (!events.length) return;
    const novos: ToastItem[] = events.map((e) => ({ ...e, toastId: ++toastSeq }));
    setToasts((q) => [...q.slice(-2), ...novos]);
    const celebra = events.find((e) => e.kind === "lead") ?? events.find((e) => e.kind === "meta");
    if (celebra) { setBanner(celebra); setBurst((b) => b + 1); }
    consume();
  }, [events, consume]);

  // auto-dismiss de toasts e banner
  React.useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((q) => q.slice(1)), 3600);
    return () => clearTimeout(id);
  }, [toasts]);
  React.useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(id);
  }, [banner]);
  React.useEffect(() => {
    if (!burst) return;
    const id = setTimeout(() => setBurst(0), 2000);
    return () => clearTimeout(id);
  }, [burst]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-4">
      <CelebrationBanner event={banner} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-liv-sage opacity-75" style={{ animation: "liv-pulse-dot 1.6s ease-in-out infinite" }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-liv-sage" />
          </span>
          <h2 className={telao ? "text-3xl font-bold text-liv-ink" : "text-lg font-bold text-liv-ink"}>Ranking ao vivo</h2>
        </div>
        {!telao && onOpenTelao && (
          <Button variant="secondary" size="sm" onClick={onOpenTelao}>
            <Layers className="mr-1.5 h-4 w-4" /> Modo telão
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className="liv-skeleton h-20 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {top3.length > 0 && <Podium top3={top3} big={telao} />}
          {rest.length > 0 && <div className="space-y-2.5">{rest.map((v) => <RankingRow key={v.id} v={v} big={telao} />)}</div>}
        </>
      )}

      <Toasts items={toasts} />
      <Confetti burstKey={burst} />

      {demo && <DemoTrigger />}
    </div>
  );
}

function DemoTrigger() {
  // Placeholder de demo: gatilho visual só-dev (ver Task 16, que injeta a lógica).
  return null;
}

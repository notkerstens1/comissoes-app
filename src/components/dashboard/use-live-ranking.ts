"use client";

import * as React from "react";
import { diffRanking, type RankedVendedor, type LiveEvent } from "@/lib/ranking";

export interface RankingPayload {
  ranking: RankedVendedor[];
  totais: { totalGeralVendido: number; totalGeralVendas: number };
  meta: number;
  geradoEm: string;
}

interface UseLiveRankingOpts {
  inicio: string;
  fim: string;
  intervalMs?: number;
  alwaysOn?: boolean; // telão: mantém polling mesmo com aba oculta
  fetcher?: (url: string) => Promise<RankingPayload>;
}

const defaultFetcher = async (url: string): Promise<RankingPayload> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ranking ${res.status}`);
  return res.json();
};

export function useLiveRanking({ inicio, fim, intervalMs = 25000, alwaysOn = false, fetcher = defaultFetcher }: UseLiveRankingOpts) {
  const [ranking, setRanking] = React.useState<RankedVendedor[]>([]);
  const [totais, setTotais] = React.useState<RankingPayload["totais"] | null>(null);
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const prevRef = React.useRef<RankedVendedor[]>([]);
  const genRef = React.useRef(0);

  const url = `/api/dashboard/ranking?inicio=${inicio}&fim=${fim}`;

  const tick = React.useCallback(async () => {
    const gen = genRef.current;
    try {
      const data = await fetcher(url);
      if (gen !== genRef.current) return; // período mudou no meio do fetch — descarta resultado stale
      const next = data.ranking;
      const novos = diffRanking(prevRef.current, next);
      if (novos.length) setEvents((q) => [...q, ...novos]);
      prevRef.current = next;
      setRanking(next);
      setTotais(data.totais);
    } catch {
      /* mantém último snapshot em caso de falha de rede */
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, [url, fetcher]);

  // reset de baseline ao trocar de período (bump de geração invalida fetches em voo)
  React.useEffect(() => { genRef.current += 1; prevRef.current = []; setLoading(true); }, [inicio, fim]);

  React.useEffect(() => {
    let active = true;
    const run = () => { if (active) tick(); };
    run();
    const id = setInterval(() => {
      if (alwaysOn || !document.hidden) run();
    }, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [tick, intervalMs, alwaysOn]);

  const consume = React.useCallback(() => setEvents([]), []);

  return { ranking, totais, events, loading, consume };
}

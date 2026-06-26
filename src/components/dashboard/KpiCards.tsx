"use client";

import * as React from "react";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/ui/count-up";
import type { RankedVendedor } from "@/lib/ranking";

interface RankingPayload {
  ranking: RankedVendedor[];
  totais: { totalGeralVendido: number; totalGeralVendas: number };
  meta: number;
  geradoEm: string;
  badges: unknown;
}

export function KpiCards({ inicio, fim }: { inicio: string; fim: string }) {
  const [data, setData] = React.useState<RankingPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/dashboard/ranking?inicio=${inicio}&fim=${fim}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json) setData(json as RankingPayload);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [inicio, fim]);

  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="liv-skeleton h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const { totais, ranking } = data;
  const faturamento = totais.totalGeralVendido;
  const vendas = totais.totalGeralVendas;
  const ticketMedio = vendas > 0 ? faturamento / vendas : 0;

  const vendedoresComVendas = ranking.filter((r) => r.qtdVendas > 0);
  const margemMedia =
    vendedoresComVendas.length > 0
      ? vendedoresComVendas.reduce((sum, r) => sum + r.margemMedia, 0) /
        vendedoresComVendas.length
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Faturamento"
        tone="accent"
        value={<CountUp value={faturamento} prefix="R$ " />}
      />
      <StatCard
        label="Vendas"
        value={<CountUp value={vendas} />}
      />
      <StatCard
        label="Ticket médio"
        value={<CountUp value={ticketMedio} prefix="R$ " />}
      />
      <StatCard
        label="Margem média"
        value={<CountUp value={margemMedia} decimals={2} suffix="x" />}
      />
    </div>
  );
}

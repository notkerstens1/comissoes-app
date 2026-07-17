"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { MetaProgressoCard } from "@/components/dashboard/MetaProgressoCard";
import { LiveRanking } from "@/components/dashboard/LiveRanking";
import { CampanhasSection } from "@/components/dashboard/CampanhasSection";
import { getCurrentWeekRange, getCurrentMonthRange } from "@/lib/dates";

type Periodo = "semana" | "mes";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [periodo, setPeriodo] = React.useState<Periodo>("semana");
  const [demo, setDemo] = React.useState(false);
  const range = periodo === "semana" ? getCurrentWeekRange() : getCurrentMonthRange();

  React.useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
  }, []);

  return (
    <div className="space-y-10">
      <div className="liv-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-liv-ink">
            Olá, {session?.user?.name?.split(" ")[0]}
            <span className="text-liv-sage">.</span>
          </h1>
          <p className="mt-1 text-sm text-liv-muted">
            Acompanhe as campanhas e o ranking do time
          </p>
        </div>
        <SegmentedControl
          value={periodo}
          onChange={setPeriodo}
          options={[
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mês" },
          ]}
        />
      </div>

      <MetaProgressoCard />

      <KpiCards inicio={range.start} fim={range.end} />

      <CampanhasSection userRole={(session?.user as { role?: string })?.role} />

      <LiveRanking
        inicio={range.start}
        fim={range.end}
        demo={demo}
        onOpenTelao={() => router.push("/telao")}
      />
    </div>
  );
}

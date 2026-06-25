"use client";

import { useSession } from "next-auth/react";
import { CampanhasSection } from "@/components/dashboard/CampanhasSection";
import { RankingSection } from "@/components/dashboard/RankingSection";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="liv-rise">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-liv-ink">
          Olá, {session?.user?.name?.split(" ")[0]}
          <span className="text-liv-sage">.</span>
        </h1>
        <p className="mt-1 text-sm text-liv-muted">
          Acompanhe as campanhas e o ranking do time
        </p>
      </div>

      {/* Campanhas (topo) */}
      <CampanhasSection userRole={(session?.user as { role?: string })?.role} />

      {/* Ranking de Vendedores (principal) */}
      <RankingSection />
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { CampanhasSection } from "@/components/dashboard/CampanhasSection";
import { RankingSection } from "@/components/dashboard/RankingSection";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          Ola, {session?.user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-400 text-sm">
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

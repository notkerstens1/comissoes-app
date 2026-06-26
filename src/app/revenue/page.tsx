"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { isAdmin, canViewDashboardCRO } from "@/lib/roles";
import { RevenueDateFilter } from "@/components/revenue/RevenueDateFilter";
import { SyncButton } from "@/components/revenue/SyncButton";
import { AlertaConcentracao } from "@/components/cro/AlertaConcentracao";
import { QualidadeBanner } from "@/components/cro/QualidadeBanner";
import { CanaisOverview } from "@/components/cro/CanaisOverview";
import { MetaCruzamento } from "@/components/cro/MetaCruzamento";
import { VendasSemFonteModal } from "@/components/cro/VendasSemFonteModal";
import { PageHeader } from "@/components/ui/page-header";
import type { CROOverview } from "@/components/cro/types";

export default function RevenuePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const podeVerCRO = canViewDashboardCRO(role);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [croData, setCroData] = useState<CROOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalSemFonte, setModalSemFonte] = useState(false);

  // Default: mes corrente
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate || !podeVerCRO) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/cro/overview?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) setCroData(await res.json());
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, podeVerCRO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (!podeVerCRO) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-liv-muted text-sm">Acesso restrito a Diretor, Supervisor e Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue"
        title="Dashboard CRO"
        subtitle="Análise integrada — canais de aquisição cruzados com tráfego pago"
        actions={
          <>
            <RevenueDateFilter startDate={startDate} endDate={endDate} onChange={handleDateChange} />
            {isAdmin(role) && <SyncButton onSyncComplete={fetchData} />}
          </>
        }
      />

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liv-sage"></div>
        </div>
      )}

      {/* CRO */}
      {!loading && croData && (
        <div className="space-y-4">
          <AlertaConcentracao
            exibir={croData.alertaConcentracao.exibir}
            canal={croData.alertaConcentracao.canal}
            percentual={croData.alertaConcentracao.percentual}
          />
          <QualidadeBanner
            totalVendas={croData.qualidadeDado.totalVendas}
            classificadas={croData.qualidadeDado.classificadas}
            semFonte={croData.qualidadeDado.semFonte}
            percentualClassificadas={croData.qualidadeDado.percentualClassificadas}
            vendasSemFonte={croData.qualidadeDado.vendasSemFonte}
            onAbrirDetalhe={() => setModalSemFonte(true)}
          />
          <CanaisOverview
            canais={croData.canais}
            comparacao={croData.comparacaoMesAnterior}
            externoBreakdown={croData.externoBreakdown}
            totalReceita={croData.totaisPeriodo.receitaTotal}
          />
          <MetaCruzamento data={croData.metaVsVendas} />
        </div>
      )}

      {/* Modal de vendas sem fonte */}
      {modalSemFonte && croData && (
        <VendasSemFonteModal
          vendas={croData.qualidadeDado.vendasSemFonte}
          onClose={() => setModalSemFonte(false)}
        />
      )}
    </div>
  );
}

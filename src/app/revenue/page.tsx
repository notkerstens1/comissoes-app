"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { isDiretor, isAdmin, isPosVenda, canViewDashboardCRO } from "@/lib/roles";
import { RevenueDateFilter } from "@/components/revenue/RevenueDateFilter";
import { SyncButton } from "@/components/revenue/SyncButton";
import { SocialSummaryCards } from "@/components/revenue/SocialSummaryCards";
import { SocialGrowthTrend } from "@/components/revenue/SocialGrowthTrend";
import { TopPostsGrid } from "@/components/revenue/TopPostsGrid";
import { PosVendaKPIs } from "@/components/revenue/PosVendaKPIs";
import { PosVendaPipeline } from "@/components/revenue/PosVendaPipeline";
import { FinancialKPIs } from "@/components/revenue/FinancialKPIs";
import { FinancialTrend } from "@/components/revenue/FinancialTrend";
import { AlertaConcentracao } from "@/components/cro/AlertaConcentracao";
import { QualidadeBanner } from "@/components/cro/QualidadeBanner";
import { CanaisOverview } from "@/components/cro/CanaisOverview";
import { MetaCruzamento } from "@/components/cro/MetaCruzamento";
import { VendasSemFonteModal } from "@/components/cro/VendasSemFonteModal";
import type { CROOverview } from "@/components/cro/types";
import { BarChart3, Megaphone, PackageCheck, DollarSign } from "lucide-react";

type Tab = "cro" | "marketing" | "posvenda" | "financeiro";

export default function RevenuePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const podeVerCRO = canViewDashboardCRO(role);

  const [tab, setTab] = useState<Tab>(podeVerCRO ? "cro" : "marketing");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [croData, setCroData] = useState<CROOverview | null>(null);
  const [marketingData, setMarketingData] = useState<any>(null);
  const [posVendaData, setPosVendaData] = useState<any>(null);
  const [financeiroData, setFinanceiroData] = useState<any>(null);
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
    if (!startDate || !endDate) return;
    setLoading(true);

    try {
      if (tab === "cro" && podeVerCRO) {
        const res = await fetch(`/api/cro/overview?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) setCroData(await res.json());
      } else if (tab === "marketing") {
        const res = await fetch(`/api/revenue/marketing?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) setMarketingData(await res.json());
      } else if (tab === "posvenda") {
        const res = await fetch(`/api/revenue/pos-venda`);
        if (res.ok) setPosVendaData(await res.json());
      } else if (tab === "financeiro" && isDiretor(role)) {
        const res = await fetch(`/api/revenue/financeiro?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) setFinanceiroData(await res.json());
      }
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  }, [tab, startDate, endDate, role, podeVerCRO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const tabs: { key: Tab; label: string; icon: any; visible: boolean }[] = [
    { key: "cro", label: "CRO", icon: BarChart3, visible: podeVerCRO },
    { key: "marketing", label: "Marketing", icon: Megaphone, visible: true },
    { key: "posvenda", label: "Pos-Venda", icon: PackageCheck, visible: !isPosVenda(role) || role === "POS_VENDA" || isAdmin(role) },
    { key: "financeiro", label: "Financeiro", icon: DollarSign, visible: isDiretor(role) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard CRO</h1>
          <p className="text-gray-400 text-sm mt-1">
            Análise integrada — canais de aquisição, tráfego pago, marketing, pós-venda e financeiro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RevenueDateFilter startDate={startDate} endDate={endDate} onChange={handleDateChange} />
          {isAdmin(role) && <SyncButton onSyncComplete={fetchData} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.filter((t) => t.visible).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? "bg-lime-400/10 text-lime-400 border border-lime-400/30"
                : "text-gray-400 hover:text-white hover:bg-[#1a1f2e]"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-400"></div>
        </div>
      )}

      {/* CRO */}
      {!loading && tab === "cro" && croData && (
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

      {!loading && tab === "marketing" && marketingData && (
        <div className="space-y-6">
          <SocialSummaryCards instagram={marketingData.instagram} youtube={marketingData.youtube} />
          <SocialGrowthTrend trend={marketingData.socialTrend} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopPostsGrid posts={marketingData.topPosts} platform="instagram" />
            <TopPostsGrid posts={marketingData.topVideos} platform="youtube" />
          </div>
        </div>
      )}

      {!loading && tab === "posvenda" && posVendaData && (
        <div className="space-y-6">
          <PosVendaKPIs kpis={posVendaData.kpis} />
          <PosVendaPipeline pipeline={posVendaData.pipeline} atrasados={posVendaData.atrasados} />
        </div>
      )}

      {!loading && tab === "financeiro" && financeiroData && (
        <div className="space-y-6">
          <FinancialKPIs kpis={financeiroData.kpis} />
          <FinancialTrend trend={financeiroData.trend} />
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

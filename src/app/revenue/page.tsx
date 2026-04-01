"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { isDiretor, isAdmin, isPosVenda } from "@/lib/roles";
import { RevenueDateFilter } from "@/components/revenue/RevenueDateFilter";
import { SyncButton } from "@/components/revenue/SyncButton";
import { AlertBanner } from "@/components/revenue/AlertBanner";
import { RevenueSummaryCards } from "@/components/revenue/RevenueSummaryCards";
import { FunnelVertical } from "@/components/revenue/FunnelVertical";
import { SpendLeadsTrend } from "@/components/revenue/SpendLeadsTrend";
import { TeamPerformance } from "@/components/revenue/TeamPerformance";
import { CampaignROI } from "@/components/revenue/CampaignROI";
import { SocialSummaryCards } from "@/components/revenue/SocialSummaryCards";
import { SocialGrowthTrend } from "@/components/revenue/SocialGrowthTrend";
import { TopPostsGrid } from "@/components/revenue/TopPostsGrid";
import { PosVendaKPIs } from "@/components/revenue/PosVendaKPIs";
import { PosVendaPipeline } from "@/components/revenue/PosVendaPipeline";
import { FinancialKPIs } from "@/components/revenue/FinancialKPIs";
import { FinancialTrend } from "@/components/revenue/FinancialTrend";
import { BarChart3, Megaphone, PackageCheck, DollarSign } from "lucide-react";

type Tab = "geral" | "marketing" | "posvenda" | "financeiro";

export default function RevenuePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [tab, setTab] = useState<Tab>("geral");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overviewData, setOverviewData] = useState<any>(null);
  const [marketingData, setMarketingData] = useState<any>(null);
  const [posVendaData, setPosVendaData] = useState<any>(null);
  const [financeiroData, setFinanceiroData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Defaults: ultimos 30 dias
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);

    try {
      if (tab === "geral") {
        const res = await fetch(`/api/revenue/overview?startDate=${startDate}&endDate=${endDate}`);
        if (res.ok) setOverviewData(await res.json());
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
  }, [tab, startDate, endDate, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const tabs: { key: Tab; label: string; icon: any; visible: boolean }[] = [
    { key: "geral", label: "Visao Geral", icon: BarChart3, visible: true },
    { key: "marketing", label: "Marketing", icon: Megaphone, visible: true },
    { key: "posvenda", label: "Pos-Venda", icon: PackageCheck, visible: !isPosVenda(role) || role === "POS_VENDA" || isAdmin(role) },
    { key: "financeiro", label: "Financeiro", icon: DollarSign, visible: isDiretor(role) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Visao 360 — Marketing, Vendas, Pos-Venda e Financeiro</p>
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

      {/* Tab Content */}
      {!loading && tab === "geral" && overviewData && (
        <div className="space-y-6">
          {overviewData.alerts?.length > 0 && <AlertBanner alerts={overviewData.alerts} />}
          <RevenueSummaryCards kpis={overviewData.kpis} role={role} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FunnelVertical funnel={overviewData.funnel} />
            <div className="lg:col-span-2">
              <SpendLeadsTrend trend={overviewData.trend} />
            </div>
          </div>
          <TeamPerformance team={overviewData.team} />
          <CampaignROI campaigns={overviewData.campaigns} />
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
    </div>
  );
}

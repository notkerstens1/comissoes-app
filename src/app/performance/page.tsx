"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { isDiretor, isSupervisor } from "@/lib/roles";
import { DatePreset, getRangeFromPreset } from "@/lib/dates";
import { KPIResult } from "@/lib/kpis";
import { DateRangeFilter } from "@/components/performance/DateRangeFilter";
import { InvestmentToggle } from "@/components/performance/InvestmentToggle";
import { SummaryCards } from "@/components/performance/SummaryCards";
import { KpiCard } from "@/components/performance/KpiCard";
import { TeamTrendChart } from "@/components/performance/TeamTrendChart";
import { FunnelEfficiencyChart } from "@/components/performance/FunnelEfficiencyChart";
import { CompletenessCalendar } from "@/components/performance/CompletenessCalendar";
import { VendorDrilldown } from "@/components/performance/VendorDrilldown";
import { EditDayPanel } from "@/components/performance/EditDayPanel";
import { TrafficForm } from "@/components/performance/TrafficForm";
import { CommercialTable } from "@/components/performance/CommercialTable";
import { Save, Copy } from "lucide-react";

interface TrafficTotals {
  pessoasAlcancadas: number;
  totalLeads: number;
  valorInvestidoVendas: number;
  valorInvestidoBranding: number;
  valorGasto: number;
}

interface CommercialTotals {
  atendidos: number;
  mql: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  valorEmVendas: number;
  leadsDescartados: number;
}

interface DailyDataEntry {
  date: string;
  traffic: {
    pessoasAlcancadas: number;
    totalLeads: number;
    valorInvestidoVendas: number;
    valorInvestidoBranding: number;
    valorGasto: number;
  };
  commercial: {
    atendidos: number;
    mql: number;
    reunioes: number;
    propostas: number;
    fechados: number;
    valorEmVendas: number;
    leadsDescartados: number;
  };
}

interface VendorBreakdownEntry {
  vendedorId: string;
  nome: string;
  atendidos: number;
  mql: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  valorEmVendas: number;
  leadsDescartados: number;
}

interface CompletenessEntry {
  date: string;
  hasTraffic: boolean;
  hasCommercial: boolean;
  status: string;
}

interface SummaryData {
  period: { startDate: string; endDate: string };
  trafficTotals: TrafficTotals;
  commercialTotals: CommercialTotals;
  kpis: KPIResult;
  dailyData: DailyDataEntry[];
  vendorBreakdown: VendorBreakdownEntry[];
  completeness: CompletenessEntry[];
}

interface TrafficData {
  pessoasAlcancadas: number;
  totalLeads: number;
  valorInvestidoVendas: number;
  valorInvestidoBranding: number;
  valorGasto: number;
}

interface VendorCommercial {
  vendedorId: string;
  nome: string;
  atendidos: number;
  mql: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  valorEmVendas: number;
  leadsDescartados: number;
}

type Tab = "dashboard" | "registrar";

export default function PerformancePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // =============================================
  // DASHBOARD STATE
  // =============================================
  const initialRange = getRangeFromPreset("current_week");
  const [preset, setPreset] = useState<DatePreset>("current_week");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [rangeLabel, setRangeLabel] = useState(initialRange.label);
  const [investmentType, setInvestmentType] = useState<"vendas" | "total">("vendas");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Permissoes
  const canEditTraffic = isDiretor(session?.user?.role);
  const canEditCommercial = true; // isAdmin (ADMIN e DIRETOR) — ja protegido pelo layout
  const trafficReadOnly = isSupervisor(session?.user?.role); // ADMIN = readonly traffic

  // Fetch dados dashboard
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, investmentType });
      const res = await fetch(`/api/performance/summary?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Erro ao carregar performance:", error);
    }
    setLoading(false);
  }, [startDate, endDate, investmentType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dashboard handlers
  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      const range = getRangeFromPreset(newPreset);
      setStartDate(range.start);
      setEndDate(range.end);
      setRangeLabel(range.label);
    }
  };

  const handleCustomRangeChange = (start: string, end: string) => {
    setPreset("custom");
    setStartDate(start);
    setEndDate(end);
    setRangeLabel(`${start} a ${end}`);
  };

  const handleDayClick = (date: string) => {
    setSelectedDay(date);
  };

  const handlePanelClose = () => {
    setSelectedDay(null);
  };

  const handlePanelSave = () => {
    setSelectedDay(null);
    fetchData();
  };

  // =============================================
  // REGISTRAR STATE
  // =============================================
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const [regDate, setRegDate] = useState(today);
  const [regTraffic, setRegTraffic] = useState<TrafficData>({
    pessoasAlcancadas: 0,
    totalLeads: 0,
    valorInvestidoVendas: 0,
    valorInvestidoBranding: 0,
    valorGasto: 0,
  });
  const [regVendors, setRegVendors] = useState<VendorCommercial[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regSaving, setRegSaving] = useState(false);
  const [regCopying, setRegCopying] = useState(false);
  const [regMessage, setRegMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch day data for Registrar tab
  const fetchDayData = useCallback(async (date: string) => {
    setRegLoading(true);
    setRegMessage(null);
    try {
      const res = await fetch(`/api/performance/day?date=${date}`);
      if (res.ok) {
        const json = await res.json();

        // Set traffic data
        if (json.traffic) {
          setRegTraffic({
            pessoasAlcancadas: json.traffic.pessoasAlcancadas ?? 0,
            totalLeads: json.traffic.totalLeads ?? 0,
            valorInvestidoVendas: json.traffic.valorInvestidoVendas ?? 0,
            valorInvestidoBranding: json.traffic.valorInvestidoBranding ?? 0,
            valorGasto: json.traffic.valorGasto ?? 0,
          });
        } else {
          setRegTraffic({
            pessoasAlcancadas: 0,
            totalLeads: 0,
            valorInvestidoVendas: 0,
            valorInvestidoBranding: 0,
            valorGasto: 0,
          });
        }

        // Build vendor list from vendors + existing commercials
        const vendors = json.vendors || [];
        const commercials = json.commercials || [];
        const commercialMap = new Map<string, any>();
        for (const c of commercials) {
          commercialMap.set(c.vendedorId, c);
        }

        const vendorList: VendorCommercial[] = vendors.map((v: any) => {
          const existing = commercialMap.get(v.id);
          return {
            vendedorId: v.id,
            nome: v.nome,
            atendidos: existing?.atendidos ?? 0,
            mql: existing?.mql ?? 0,
            reunioes: existing?.reunioes ?? 0,
            propostas: existing?.propostas ?? 0,
            fechados: existing?.fechados ?? 0,
            valorEmVendas: existing?.valorEmVendas ?? 0,
            leadsDescartados: existing?.leadsDescartados ?? 0,
          };
        });
        setRegVendors(vendorList);
      }
    } catch (error) {
      console.error("Erro ao carregar dia:", error);
      setRegMessage({ type: "error", text: "Erro ao carregar dados do dia." });
    }
    setRegLoading(false);
  }, []);

  // Fetch day data when date changes or tab switches to registrar
  useEffect(() => {
    if (activeTab === "registrar") {
      fetchDayData(regDate);
    }
  }, [activeTab, regDate, fetchDayData]);

  // Save day data
  const handleSaveDay = async () => {
    setRegSaving(true);
    setRegMessage(null);
    try {
      const payload = {
        date: regDate,
        traffic: regTraffic,
        commercials: regVendors.map((v) => ({
          vendedorId: v.vendedorId,
          atendidos: v.atendidos,
          mql: v.mql,
          reunioes: v.reunioes,
          propostas: v.propostas,
          fechados: v.fechados,
          valorEmVendas: v.valorEmVendas,
          leadsDescartados: v.leadsDescartados,
        })),
      };

      const res = await fetch("/api/performance/day", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setRegMessage({ type: "success", text: "Dados salvos com sucesso!" });
      } else {
        const err = await res.json();
        setRegMessage({ type: "error", text: err.error || "Erro ao salvar." });
      }
    } catch (error) {
      console.error("Erro ao salvar dia:", error);
      setRegMessage({ type: "error", text: "Erro ao salvar dados." });
    }
    setRegSaving(false);
  };

  // Copy day data
  const handleCopyDay = async () => {
    const targetDate = prompt("Copiar dados de " + regDate + " para qual data? (YYYY-MM-DD)");
    if (!targetDate) return;

    setRegCopying(true);
    setRegMessage(null);
    try {
      const res = await fetch("/api/performance/copy-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDate: regDate, targetDate }),
      });

      if (res.ok) {
        setRegMessage({ type: "success", text: `Dados copiados para ${targetDate}!` });
      } else {
        const err = await res.json();
        setRegMessage({ type: "error", text: err.error || "Erro ao copiar." });
      }
    } catch (error) {
      console.error("Erro ao copiar dia:", error);
      setRegMessage({ type: "error", text: "Erro ao copiar dados." });
    }
    setRegCopying(false);
  };

  // =============================================
  // RENDER
  // =============================================

  if (loading && !data && activeTab === "dashboard") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  const emptyTraffic: TrafficTotals = {
    pessoasAlcancadas: 0,
    totalLeads: 0,
    valorInvestidoVendas: 0,
    valorInvestidoBranding: 0,
    valorGasto: 0,
  };

  const emptyCommercial: CommercialTotals = {
    atendidos: 0,
    mql: 0,
    reunioes: 0,
    propostas: 0,
    fechados: 0,
    valorEmVendas: 0,
    leadsDescartados: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Performance</h1>
          {activeTab === "dashboard" && (
            <p className="text-gray-400 text-sm mt-1">{rangeLabel}</p>
          )}
        </div>
        {activeTab === "dashboard" && (
          <InvestmentToggle type={investmentType} onChange={setInvestmentType} />
        )}
      </div>

      {/* Tab navigation */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-lg p-1 inline-flex gap-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "dashboard"
              ? "bg-teal-400 text-gray-900"
              : "text-gray-400 hover:text-gray-100"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("registrar")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "registrar"
              ? "bg-teal-400 text-gray-900"
              : "text-gray-400 hover:text-gray-100"
          }`}
        >
          Registrar
        </button>
      </div>

      {/* ===================== DASHBOARD TAB ===================== */}
      {activeTab === "dashboard" && (
        <>
          {/* Filtro de data */}
          <DateRangeFilter
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            label={rangeLabel}
            onPresetChange={handlePresetChange}
            onCustomRangeChange={handleCustomRangeChange}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400"></div>
              <span className="ml-2 text-sm text-gray-400">Atualizando...</span>
            </div>
          )}

          {/* Cards de resumo */}
          <SummaryCards
            trafficTotals={data?.trafficTotals || emptyTraffic}
            commercialTotals={data?.commercialTotals || emptyCommercial}
          />

          {/* KPIs */}
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">KPIs de Performance</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                label="CPM"
                value={data?.kpis?.cpm ?? null}
                prefix="R$ "
                color="teal"
              />
              <KpiCard
                label="CPL"
                value={data?.kpis?.cpl ?? null}
                prefix="R$ "
                color="teal"
              />
              <KpiCard
                label="Custo MQL"
                value={data?.kpis?.custoMql ?? null}
                prefix="R$ "
                color="teal"
              />
              <KpiCard
                label="Custo SQL"
                value={data?.kpis?.custoSql ?? null}
                prefix="R$ "
                color="teal"
              />
              <KpiCard
                label="CAC"
                value={data?.kpis?.cac ?? null}
                prefix="R$ "
                color="teal"
              />
            </div>
          </div>

          {/* Grafico de tendencia do time */}
          <TeamTrendChart
            dailyData={data?.dailyData || []}
            onDayClick={handleDayClick}
          />

          {/* Grafico de eficiencia do funil (KPIs diarios) */}
          <FunnelEfficiencyChart
            dailyData={data?.dailyData || []}
            investmentType={investmentType}
            onDayClick={handleDayClick}
          />

          {/* Calendario de completude */}
          <CompletenessCalendar
            completeness={data?.completeness || []}
            onDayClick={handleDayClick}
          />

          {/* Drill-down por vendedor */}
          <VendorDrilldown vendorBreakdown={data?.vendorBreakdown || []} />

          {/* Painel de edicao do dia */}
          <EditDayPanel
            date={selectedDay}
            onClose={handlePanelClose}
            onSave={handlePanelSave}
            canEditTraffic={canEditTraffic}
            canEditCommercial={canEditCommercial}
          />
        </>
      )}

      {/* ===================== REGISTRAR TAB ===================== */}
      {activeTab === "registrar" && (
        <div className="space-y-6">
          {/* Date selector */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Data do registro
                </label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDay}
                  disabled={regSaving}
                  className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {regSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
                <button
                  onClick={handleCopyDay}
                  disabled={regCopying}
                  className="px-4 py-2 rounded-lg border border-[#232a3b] text-gray-300 text-sm font-medium hover:bg-[#232a3b] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {regCopying ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  Copiar
                </button>
              </div>
            </div>

            {/* Status message */}
            {regMessage && (
              <div
                className={`mt-3 px-4 py-2 rounded-lg text-sm ${
                  regMessage.type === "success"
                    ? "bg-teal-400/10 text-teal-400"
                    : "bg-red-400/10 text-red-400"
                }`}
              >
                {regMessage.text}
              </div>
            )}
          </div>

          {/* Loading */}
          {regLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
              <span className="ml-2 text-sm text-gray-400">Carregando dados do dia...</span>
            </div>
          )}

          {/* Traffic Form */}
          {!regLoading && (
            <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
              <TrafficForm
                data={regTraffic}
                onChange={setRegTraffic}
                readOnly={trafficReadOnly}
              />
            </div>
          )}

          {/* Commercial Table */}
          {!regLoading && (
            <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
              <CommercialTable
                vendors={regVendors}
                onChange={setRegVendors}
                readOnly={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Eye,
  Users,
  DollarSign,
  Megaphone,
  Wallet,
  MessageCircle,
  UserCheck,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

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

interface SummaryCardsProps {
  trafficTotals: TrafficTotals;
  commercialTotals: CommercialTotals;
}

interface CardDef {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  isCurrency: boolean;
}

function SummaryCard({ label, value, icon: Icon, color, isCurrency }: CardDef) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-400/10", text: "text-blue-400" },
    green: { bg: "bg-lime-400/10", text: "text-lime-400" },
    teal: { bg: "bg-teal-400/10", text: "text-teal-400" },
    purple: { bg: "bg-purple-400/10", text: "text-purple-400" },
    red: { bg: "bg-red-400/10", text: "text-red-400" },
    amber: { bg: "bg-amber-400/10", text: "text-amber-400" },
    emerald: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
  };

  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="bg-[#1a1f2e] rounded-xl p-4 shadow-sm border border-[#232a3b]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
      </div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-100">
        {isCurrency ? formatCurrency(value) : formatNumber(value, 0)}
      </p>
    </div>
  );
}

export function SummaryCards({
  trafficTotals,
  commercialTotals,
}: SummaryCardsProps) {
  const trafficCards: CardDef[] = [
    {
      label: "Pessoas Alcancadas",
      value: trafficTotals.pessoasAlcancadas,
      icon: Eye,
      color: "blue",
      isCurrency: false,
    },
    {
      label: "Total Leads",
      value: trafficTotals.totalLeads,
      icon: Users,
      color: "green",
      isCurrency: false,
    },
    {
      label: "Invest. Vendas",
      value: trafficTotals.valorInvestidoVendas,
      icon: DollarSign,
      color: "teal",
      isCurrency: true,
    },
    {
      label: "Invest. Branding",
      value: trafficTotals.valorInvestidoBranding,
      icon: Megaphone,
      color: "purple",
      isCurrency: true,
    },
    {
      label: "Valor Gasto",
      value: trafficTotals.valorGasto,
      icon: Wallet,
      color: "red",
      isCurrency: true,
    },
  ];

  const commercialCards: CardDef[] = [
    {
      label: "Atendidos",
      value: commercialTotals.atendidos,
      icon: MessageCircle,
      color: "blue",
      isCurrency: false,
    },
    {
      label: "MQL",
      value: commercialTotals.mql,
      icon: UserCheck,
      color: "green",
      isCurrency: false,
    },
    {
      label: "Reunioes/SQL",
      value: commercialTotals.reunioes,
      icon: Calendar,
      color: "teal",
      isCurrency: false,
    },
    {
      label: "Propostas",
      value: commercialTotals.propostas,
      icon: FileText,
      color: "amber",
      isCurrency: false,
    },
    {
      label: "Fechados",
      value: commercialTotals.fechados,
      icon: CheckCircle,
      color: "emerald",
      isCurrency: false,
    },
    {
      label: "Valor Vendas",
      value: commercialTotals.valorEmVendas,
      icon: DollarSign,
      color: "green",
      isCurrency: true,
    },
    {
      label: "Descartados",
      value: commercialTotals.leadsDescartados,
      icon: XCircle,
      color: "red",
      isCurrency: false,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Trafego */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Trafego
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {trafficCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* Comercial */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Comercial
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {commercialCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
}

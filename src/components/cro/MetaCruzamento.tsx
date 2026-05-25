"use client";

import { DollarSign, Users, ShoppingCart, TrendingUp, Target } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { CROOverview } from "./types";

interface Props {
  data: CROOverview["metaVsVendas"];
}

export function MetaCruzamento({ data }: Props) {
  const semDados = data.spendTotal === 0 && data.leadsTotal === 0;

  const kpis = [
    {
      label: "Investido (Meta)",
      value: formatCurrency(data.spendTotal),
      icon: DollarSign,
      color: "text-red-400",
    },
    {
      label: "Leads",
      value: formatNumber(data.leadsTotal, 0),
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "CPL global",
      value: data.leadsTotal > 0 ? formatCurrency(data.cplGlobal) : "—",
      icon: Target,
      color: "text-purple-400",
    },
    {
      label: "Vendas (Tráfego)",
      value: formatNumber(data.vendasTrafego, 0),
      icon: ShoppingCart,
      color: "text-amber-400",
    },
    {
      label: "CAC",
      value: data.vendasTrafego > 0 ? formatCurrency(data.cac) : "—",
      icon: ShoppingCart,
      color: "text-amber-400",
    },
    {
      label: "ROAS",
      value: data.spendTotal > 0 ? `${data.roas.toFixed(1)}x` : "—",
      icon: TrendingUp,
      color: data.roas >= 3 ? "text-lime-400" : data.roas >= 1 ? "text-amber-400" : "text-red-400",
    },
  ];

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Tráfego pago × Vendas</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Spend e leads do Meta Ads cruzados com vendas de fonte = Tráfego
          </p>
        </div>
        {data.leadsTotal > 0 && (
          <p className="text-xs text-gray-400">
            {data.taxaConversaoLeadVenda.toFixed(1)}% lead → venda
          </p>
        )}
      </div>

      {semDados ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Sem dados do Meta Ads sincronizados no período.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-5">
            {kpis.map((k) => (
              <div key={k.label} className="bg-[#141820] border border-[#232a3b] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{k.label}</span>
                </div>
                <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Tabela por campanha */}
          {data.porCampanha.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 uppercase tracking-wider">
                  <tr className="border-b border-[#232a3b]">
                    <th className="py-2 text-left font-medium">Campanha</th>
                    <th className="py-2 text-right font-medium">Spend</th>
                    <th className="py-2 text-right font-medium">Impr.</th>
                    <th className="py-2 text-right font-medium">CTR</th>
                    <th className="py-2 text-right font-medium">Leads</th>
                    <th className="py-2 text-right font-medium">CPL</th>
                    <th className="py-2 text-right font-medium">CPM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232a3b]">
                  {data.porCampanha.map((c) => (
                    <tr key={c.campaignId} className="hover:bg-[#141820]/50">
                      <td className="py-2.5 text-gray-100 text-xs max-w-[280px] truncate" title={c.campaignName}>
                        {c.campaignName}
                      </td>
                      <td className="py-2.5 text-right text-gray-100">{formatCurrency(c.spend)}</td>
                      <td className="py-2.5 text-right text-gray-300">{formatNumber(c.impressions, 0)}</td>
                      <td className="py-2.5 text-right text-gray-300">{c.ctr.toFixed(2)}%</td>
                      <td className="py-2.5 text-right text-gray-100">{c.leads}</td>
                      <td className="py-2.5 text-right text-gray-300">
                        {c.leads > 0 ? formatCurrency(c.cpl) : "—"}
                      </td>
                      <td className="py-2.5 text-right text-gray-300">{formatCurrency(c.cpm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-500 mt-3">
                ROAS e CAC calculados sobre vendas com fonte = TRAFEGO (vendas EXTERNA do Daniel ficam fora). Atribuição
                por criativo entra na próxima versão quando ChatClean integrar.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

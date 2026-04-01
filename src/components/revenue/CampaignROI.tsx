"use client";

import { formatCurrency } from "@/lib/utils";

interface Campaign {
  nome: string;
  spend: number;
  totalResults: number;
  cpl: number | null;
  ctr: number;
  impressions: number;
  clicks: number;
}

export function CampaignROI({ campaigns }: { campaigns: Campaign[] }) {
  if (!campaigns || campaigns.length === 0) return null;

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Campanhas Meta Ads</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#232a3b]">
              <th className="text-left text-gray-400 font-medium py-2 px-3">Campanha</th>
              <th className="text-right text-gray-400 font-medium py-2 px-2">Investido</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">Resultados</th>
              <th className="text-right text-gray-400 font-medium py-2 px-2">CPL</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">CTR</th>
            </tr>
          </thead>
          <tbody>
            {campaigns
              .sort((a, b) => b.spend - a.spend)
              .map((c) => (
                <tr key={c.nome} className="border-b border-[#232a3b]/50 hover:bg-[#232a3b]/30">
                  <td className="py-3 px-3 text-white font-medium max-w-[200px] truncate">{c.nome}</td>
                  <td className="text-right text-red-400 py-3 px-2">{formatCurrency(c.spend)}</td>
                  <td className="text-center text-blue-400 font-medium py-3 px-2">{c.totalResults}</td>
                  <td className="text-right py-3 px-2">
                    <span className={c.cpl && c.cpl < 30 ? "text-lime-400" : c.cpl && c.cpl < 60 ? "text-amber-400" : "text-red-400"}>
                      {c.cpl ? formatCurrency(c.cpl) : "—"}
                    </span>
                  </td>
                  <td className="text-center text-gray-300 py-3 px-2">{c.ctr.toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

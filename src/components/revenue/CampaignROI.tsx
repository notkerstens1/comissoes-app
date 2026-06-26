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
    <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
      <h3 className="text-liv-ink font-semibold mb-4">Campanhas Meta Ads</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-liv-line">
              <th className="text-left text-liv-muted font-medium py-2 px-3">Campanha</th>
              <th className="text-right text-liv-muted font-medium py-2 px-2">Investido</th>
              <th className="text-center text-liv-muted font-medium py-2 px-2">Resultados</th>
              <th className="text-right text-liv-muted font-medium py-2 px-2">CPL</th>
              <th className="text-center text-liv-muted font-medium py-2 px-2">CTR</th>
            </tr>
          </thead>
          <tbody>
            {campaigns
              .sort((a, b) => b.spend - a.spend)
              .map((c) => (
                <tr key={c.nome} className="border-b border-liv-line/50 hover:bg-liv-surface-2/50">
                  <td className="py-3 px-3 text-liv-ink font-medium max-w-[200px] truncate">{c.nome}</td>
                  <td className="text-right text-liv-danger py-3 px-2">{formatCurrency(c.spend)}</td>
                  <td className="text-center text-liv-info font-medium py-3 px-2">{c.totalResults}</td>
                  <td className="text-right py-3 px-2">
                    <span className={c.cpl && c.cpl < 30 ? "text-liv-sage" : c.cpl && c.cpl < 60 ? "text-liv-gold" : "text-liv-danger"}>
                      {c.cpl ? formatCurrency(c.cpl) : "—"}
                    </span>
                  </td>
                  <td className="text-center text-liv-muted py-3 px-2">{c.ctr.toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

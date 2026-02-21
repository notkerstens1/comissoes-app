"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, Target, DollarSign, Users } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { formatCurrency } from "@/lib/utils";

const ESTAGIOS_LABELS: Record<string, string> = {
  REUNIAO:    "Reunião",
  PROPOSTA:   "Proposta",
  NEGOCIACAO: "Negociação",
  FECHADA:    "Fechada",
};

type ForecastData = {
  totalOportunidades: number;
  totalForecast: number;
  totalPonderado: number;
  porEstagio: Record<string, { count: number; valorTotal: number; valorPonderado: number }>;
  porVendedor: { id: string; nome: string; qtd: number; valorTotal: number; valorPonderado: number; probMedia: number }[];
};

export default function ForecastSDR() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sdr/forecast");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen bg-[#0b0f19]">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 flex items-center justify-center">
          <p className="text-gray-500">Carregando forecast...</p>
        </main>
      </div>
    );
  }

  const estagios = ["REUNIAO", "PROPOSTA", "NEGOCIACAO", "FECHADA"];

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-sky-400" />
              Forecast de Oportunidades
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Pipeline de vendas baseado nas oportunidades abertas do time
            </p>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Oportunidades Abertas</p>
              <p className="text-3xl font-bold text-sky-400">{data.totalOportunidades}</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Forecast Total</p>
              <p className="text-2xl font-bold text-sky-400">{formatCurrency(data.totalForecast)}</p>
              <p className="text-xs text-gray-500 mt-1">soma dos valores estimados</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Forecast Ponderado</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(data.totalPonderado)}</p>
              <p className="text-xs text-gray-500 mt-1">valor × probabilidade média</p>
            </div>
          </div>

          {/* Por estágio */}
          <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pipeline por Estágio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {estagios.map((est) => {
                const d = data.porEstagio[est] ?? { count: 0, valorTotal: 0, valorPonderado: 0 };
                const cores: Record<string, string> = {
                  REUNIAO: "text-sky-400 border-sky-400/30",
                  PROPOSTA: "text-amber-400 border-amber-400/30",
                  NEGOCIACAO: "text-orange-400 border-orange-400/30",
                  FECHADA: "text-emerald-400 border-emerald-400/30",
                };
                return (
                  <div key={est} className={`border rounded-xl p-4 ${cores[est]}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2">{ESTAGIOS_LABELS[est]}</p>
                    <p className="text-2xl font-bold">{d.count}</p>
                    <p className="text-xs mt-1 text-gray-400">{formatCurrency(d.valorTotal)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por vendedor */}
          <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#232a3b] flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Por Vendedor</h2>
            </div>
            {data.porVendedor.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma oportunidade registrada ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#232a3b] bg-[#141820]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Oport.</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Forecast Total</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ponderado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prob. Média</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232a3b]">
                    {data.porVendedor.map((v) => (
                      <tr key={v.id} className="hover:bg-[#141820] transition">
                        <td className="px-4 py-3 font-medium text-gray-100">{v.nome}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{v.qtd}</td>
                        <td className="px-4 py-3 text-right text-sky-400 font-medium">{formatCurrency(v.valorTotal)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(v.valorPonderado)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${v.probMedia >= 70 ? "text-emerald-400" : v.probMedia >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                            {v.probMedia}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

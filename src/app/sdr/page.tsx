"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ClipboardList, Users, DollarSign, CheckCircle } from "lucide-react";

interface DashboardData {
  totalRegistros: number;
  reunioesComparecidas: number;
  vendasVinculadas: number;
  comissaoReuniao: number;
  comissaoVenda: number;
  comissaoTotal: number;
  comissaoPendente: number;
  comissaoPaga: number;
}

export default function SDRDashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchDados();
  }, [mesAtual]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sdr/dashboard?mes=${mesAtual}`);
      const data = await res.json();
      setDados(data);
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  const cards = [
    {
      label: "Reunioes Comparecidas",
      value: dados?.reunioesComparecidas ?? 0,
      icon: Users,
      format: "number",
    },
    {
      label: "Vendas Vinculadas",
      value: dados?.vendasVinculadas ?? 0,
      icon: CheckCircle,
      format: "number",
    },
    {
      label: "Comissao Estimada",
      value: dados?.comissaoTotal ?? 0,
      icon: DollarSign,
      format: "currency",
    },
    {
      label: "Pendente / Paga",
      value: `${formatCurrency(dados?.comissaoPendente ?? 0)} / ${formatCurrency(dados?.comissaoPaga ?? 0)}`,
      icon: ClipboardList,
      format: "text",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard SDR</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
                <card.icon className="w-5 h-5 text-sky-400" />
              </div>
              <p className="text-sm text-gray-400">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-100">
              {card.format === "currency"
                ? formatCurrency(card.value as number)
                : card.format === "number"
                ? card.value
                : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="bg-gradient-to-r from-sky-500/20 to-cyan-500/20 rounded-2xl p-8 border border-sky-400/20">
        <p className="text-sky-300 text-sm font-medium">Comissao Total do Mes</p>
        <p className="text-4xl font-bold mt-2 text-gray-100">
          {formatCurrency(dados?.comissaoTotal ?? 0)}
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-sky-300/70 text-xs">Total Registros</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{dados?.totalRegistros ?? 0}</p>
          </div>
          <div>
            <p className="text-sky-300/70 text-xs">Comissao Reunioes</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.comissaoReuniao ?? 0)}</p>
          </div>
          <div>
            <p className="text-sky-300/70 text-xs">Comissao Vendas</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.comissaoVenda ?? 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

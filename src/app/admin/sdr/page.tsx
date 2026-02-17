"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ClipboardList, Users, CheckCircle, TrendingUp } from "lucide-react";

interface SDRRanking {
  id: string;
  nome: string;
  totalRegistros: number;
  reunioes: number;
  vendas: number;
  taxaConversao: number;
  comissaoTotal: number;
  comissaoPendente: number;
  comissaoPaga: number;
}

interface Totais {
  registros: number;
  reunioes: number;
  vendas: number;
  comissaoTotal: number;
}

export default function AdminSDRPage() {
  const [ranking, setRanking] = useState<SDRRanking[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchResumo();
  }, [mesAtual]);

  const fetchResumo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sdr/resumo?mes=${mesAtual}`);
      const data = await res.json();
      setRanking(data.ranking);
      setTotais(data.totais);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Visao Geral SDR</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {/* Cards totais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-sky-400" />
            </div>
            <p className="text-sm text-gray-400">Registros</p>
          </div>
          <p className="text-2xl font-bold text-gray-100">{totais?.registros ?? 0}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <p className="text-sm text-gray-400">Reunioes</p>
          </div>
          <p className="text-2xl font-bold text-gray-100">{totais?.reunioes ?? 0}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-sky-400" />
            </div>
            <p className="text-sm text-gray-400">Vendas</p>
          </div>
          <p className="text-2xl font-bold text-gray-100">{totais?.vendas ?? 0}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-sky-400" />
            </div>
            <p className="text-sm text-gray-400">Comissao Total</p>
          </div>
          <p className="text-2xl font-bold text-sky-400">{formatCurrency(totais?.comissaoTotal ?? 0)}</p>
        </div>
      </div>

      {/* Ranking SDRs */}
      {ranking.length === 0 ? (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhum SDR cadastrado</h3>
          <p className="text-sm text-gray-400">
            Adicione usuarios com perfil SDR na pagina de Vendedores.
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#232a3b]">
            <h2 className="font-semibold text-gray-100">Ranking de SDRs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820] text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">SDR</th>
                  <th className="text-center px-4 py-3 font-medium">Registros</th>
                  <th className="text-center px-4 py-3 font-medium">Reunioes</th>
                  <th className="text-center px-4 py-3 font-medium">Vendas</th>
                  <th className="text-center px-4 py-3 font-medium">Conversao</th>
                  <th className="text-right px-4 py-3 font-medium">Comissao</th>
                  <th className="text-right px-4 py-3 font-medium">Pendente</th>
                  <th className="text-right px-4 py-3 font-medium">Paga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3b]">
                {ranking.map((sdr, i) => (
                  <tr key={sdr.id} className="hover:bg-[#232a3b]">
                    <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-100">{sdr.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{sdr.totalRegistros}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{sdr.reunioes}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{sdr.vendas}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        sdr.taxaConversao >= 50
                          ? "bg-sky-400/15 text-sky-400"
                          : sdr.taxaConversao >= 30
                          ? "bg-amber-400/15 text-amber-400"
                          : "bg-red-400/15 text-red-400"
                      }`}>
                        {sdr.taxaConversao}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sky-400">
                      {formatCurrency(sdr.comissaoTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400">
                      {formatCurrency(sdr.comissaoPendente)}
                    </td>
                    <td className="px-4 py-3 text-right text-sky-400">
                      {formatCurrency(sdr.comissaoPaga)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

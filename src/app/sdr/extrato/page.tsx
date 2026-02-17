"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Users, CheckCircle, Zap } from "lucide-react";

interface Registro {
  id: string;
  nomeCliente: string;
  dataReuniao: string;
  compareceu: boolean;
  comissaoReuniao: number;
  comissaoVenda: number;
  comissaoTotal: number;
  statusPagamento: string;
  dataPagamento: string | null;
  vendedora: { nome: string };
  vendaVinculada: { id: string; cliente: string; valorVenda: number } | null;
  pagoPor: { nome: string } | null;
}

interface Resumo {
  reunioesComissao: number;
  vendasComissao: number;
  totalReuniao: number;
  totalVenda: number;
  totalGeral: number;
}

export default function ExtratoSDRPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchExtrato();
  }, [mesAtual]);

  const fetchExtrato = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sdr/extrato?mes=${mesAtual}`);
      const data = await res.json();
      setRegistros(data.registros);
      setResumo(data.resumo);
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
          <h1 className="text-2xl font-bold text-gray-100">Extrato de Comissoes</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-sky-400" />
            <p className="text-sm text-gray-400">Reunioes</p>
          </div>
          <p className="text-xl font-bold text-gray-100">
            {resumo?.reunioesComissao ?? 0} x R$ 20,00
          </p>
          <p className="text-sm text-sky-400 mt-1">
            {formatCurrency(resumo?.totalReuniao ?? 0)}
          </p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-sky-400" />
            <p className="text-sm text-gray-400">Vendas</p>
          </div>
          <p className="text-xl font-bold text-gray-100">
            {resumo?.vendasComissao ?? 0} x R$ 20,00
          </p>
          <p className="text-sm text-sky-400 mt-1">
            {formatCurrency(resumo?.totalVenda ?? 0)}
          </p>
        </div>
        <div className="bg-gradient-to-r from-sky-500/20 to-cyan-500/20 rounded-xl p-5 shadow-sm border border-sky-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-sky-400" />
            <p className="text-sm text-sky-300">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {formatCurrency(resumo?.totalGeral ?? 0)}
          </p>
        </div>
      </div>

      {/* Tabela detalhada */}
      {registros.length === 0 ? (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Sem registros neste mes</h3>
          <p className="text-sm text-gray-400">
            Suas comissoes aparecerao aqui quando houver registros.
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820] text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Vendedora</th>
                  <th className="text-center px-4 py-3 font-medium">Data</th>
                  <th className="text-right px-4 py-3 font-medium">Reuniao</th>
                  <th className="text-right px-4 py-3 font-medium">Venda</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3b]">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-[#232a3b]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-100">{r.nomeCliente}</div>
                      {r.vendaVinculada && (
                        <p className="text-xs text-sky-400 mt-0.5">
                          Venda: {formatCurrency(r.vendaVinculada.valorVenda)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{r.vendedora.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {new Date(r.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.comissaoReuniao > 0 ? (
                        <span className="text-sky-400">{formatCurrency(r.comissaoReuniao)}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.comissaoVenda > 0 ? (
                        <span className="text-sky-400">{formatCurrency(r.comissaoVenda)}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sky-400">
                      {formatCurrency(r.comissaoTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          r.statusPagamento === "PAGO"
                            ? "bg-sky-400/15 text-sky-400"
                            : "bg-amber-400/15 text-amber-400"
                        }`}
                      >
                        {r.statusPagamento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-sky-400/10 font-semibold text-sky-400">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>TOTAIS</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(resumo?.totalReuniao ?? 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(resumo?.totalVenda ?? 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(resumo?.totalGeral ?? 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

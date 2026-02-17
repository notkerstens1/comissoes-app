"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, CheckCircle, Users } from "lucide-react";

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
  vendaVinculadaId: string | null;
}

interface SDRGroup {
  id: string;
  nome: string;
  registros: Registro[];
  totalPendente: number;
  totalPago: number;
}

export default function PagamentoSDRPage() {
  const [sdrs, setSdrs] = useState<SDRGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
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
      // Buscar SDRs
      const resSdrs = await fetch("/api/admin/sdr/resumo?mes=" + mesAtual);
      const dataSdrs = await resSdrs.json();

      // Buscar todos os registros do mes
      const resAll = await fetch(`/api/sdr/registros?mes=${mesAtual}`);
      const allRegs = await resAll.json();

      const finalGroups: SDRGroup[] = dataSdrs.ranking.map((sdr: any) => {
        const regs = allRegs.filter((r: any) => r.sdrId === sdr.id);
        const pendente = regs
          .filter((r: any) => r.statusPagamento === "PENDENTE" && r.comissaoTotal > 0)
          .reduce((s: number, r: any) => s + r.comissaoTotal, 0);
        const pago = regs
          .filter((r: any) => r.statusPagamento === "PAGO")
          .reduce((s: number, r: any) => s + r.comissaoTotal, 0);

        return {
          id: sdr.id,
          nome: sdr.nome,
          registros: regs,
          totalPendente: pendente,
          totalPago: pago,
        };
      });

      setSdrs(finalGroups.filter((g: SDRGroup) => g.registros.length > 0));
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const marcarPago = async (sdrId: string) => {
    const sdr = sdrs.find((s) => s.id === sdrId);
    if (!sdr) return;

    const pendentes = sdr.registros.filter(
      (r) => r.statusPagamento === "PENDENTE" && r.comissaoTotal > 0
    );

    if (pendentes.length === 0) {
      alert("Nenhum registro pendente para pagar.");
      return;
    }

    if (!confirm(`Marcar ${pendentes.length} registro(s) de ${sdr.nome} como PAGO (${formatCurrency(sdr.totalPendente)})?`)) {
      return;
    }

    setProcessando(sdrId);
    try {
      const res = await fetch("/api/admin/sdr/pagamento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroIds: pendentes.map((r) => r.id) }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao processar pagamento");
        return;
      }

      fetchDados();
    } catch (error) {
      console.error("Erro:", error);
    }
    setProcessando(null);
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
          <h1 className="text-2xl font-bold text-gray-100">Pagamento SDR</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {sdrs.length === 0 ? (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Sem registros neste mes</h3>
          <p className="text-sm text-gray-400">
            Nenhum SDR possui registros neste periodo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sdrs.map((sdr) => {
            const pendentes = sdr.registros.filter(
              (r) => r.statusPagamento === "PENDENTE" && r.comissaoTotal > 0
            ).length;
            const pagos = sdr.registros.filter(
              (r) => r.statusPagamento === "PAGO"
            ).length;

            return (
              <div
                key={sdr.id}
                className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden"
              >
                {/* Cabecalho SDR */}
                <div className="px-6 py-4 border-b border-[#232a3b] flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-100">{sdr.nome}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {sdr.registros.length} registro(s) | {pendentes} pendente(s) | {pagos} pago(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Pendente</p>
                      <p className="text-lg font-bold text-amber-400">
                        {formatCurrency(sdr.totalPendente)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Pago</p>
                      <p className="text-lg font-bold text-sky-400">
                        {formatCurrency(sdr.totalPago)}
                      </p>
                    </div>
                    {sdr.totalPendente > 0 && (
                      <button
                        onClick={() => marcarPago(sdr.id)}
                        disabled={processando === sdr.id}
                        className="px-4 py-2 rounded-lg bg-sky-400 text-gray-900 font-medium hover:bg-sky-300 transition text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {processando === sdr.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            Marcar como Pago
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalhamento */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#141820] text-gray-400">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Cliente</th>
                        <th className="text-center px-4 py-2 font-medium">Reuniao</th>
                        <th className="text-center px-4 py-2 font-medium">Compareceu</th>
                        <th className="text-center px-4 py-2 font-medium">Venda</th>
                        <th className="text-right px-4 py-2 font-medium">Comissao</th>
                        <th className="text-center px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232a3b]">
                      {sdr.registros.map((r) => (
                        <tr key={r.id} className="hover:bg-[#232a3b]">
                          <td className="px-4 py-2 text-gray-100">{r.nomeCliente}</td>
                          <td className="px-4 py-2 text-center text-gray-400">
                            {new Date(r.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {r.compareceu ? (
                              <CheckCircle className="w-4 h-4 text-sky-400 mx-auto" />
                            ) : (
                              <span className="text-xs text-red-400">Nao</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {r.vendaVinculadaId ? (
                              <span className="text-xs text-sky-400">Sim</span>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-sky-400">
                            {formatCurrency(r.comissaoTotal)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

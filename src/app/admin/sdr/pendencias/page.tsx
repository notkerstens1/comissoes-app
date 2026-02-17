"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Link2, XCircle, CheckCircle } from "lucide-react";

interface Candidato {
  id: string;
  nomeCliente: string;
  dataReuniao: string;
  sdr: { nome: string };
  vendedora: { nome: string };
  comissaoReuniao: number;
}

interface Pendencia {
  id: string;
  vendaId: string;
  status: string;
  createdAt: string;
  venda: {
    id: string;
    cliente: string;
    valorVenda: number;
    dataConversao: string;
    vendedor: { id: string; nome: string };
  };
  candidatos: Candidato[];
}

export default function PendenciasSDRPage() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    fetchPendencias();
  }, []);

  const fetchPendencias = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sdr/pendencias");
      const data = await res.json();
      setPendencias(data);
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const resolver = async (pendenciaId: string, acao: string, registroEscolhidoId?: string) => {
    setProcessando(pendenciaId);
    try {
      const res = await fetch(`/api/admin/sdr/pendencias/${pendenciaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, registroEscolhidoId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao resolver");
        return;
      }

      fetchPendencias();
    } catch (error) {
      console.error("Erro:", error);
    }
    setProcessando(null);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Pendencias de Vinculo</h1>
        <p className="text-gray-400">Vendas com match ambiguo de SDR</p>
      </div>

      {pendencias.length === 0 ? (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <CheckCircle className="w-12 h-12 text-sky-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhuma pendencia</h3>
          <p className="text-sm text-gray-400">
            Todas as vendas foram vinculadas automaticamente ou resolvidas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendencias.map((p) => (
            <div
              key={p.id}
              className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden"
            >
              {/* Cabecalho da venda */}
              <div className="px-6 py-4 border-b border-[#232a3b] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-gray-100">{p.venda.cliente}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Venda: {formatCurrency(p.venda.valorVenda)} | Vendedora: {p.venda.vendedor.nome} |{" "}
                    {new Date(p.venda.dataConversao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={() => resolver(p.id, "SEM_SDR")}
                  disabled={processando === p.id}
                  className="px-4 py-2 rounded-lg border border-[#232a3b] text-gray-400 hover:bg-[#232a3b] transition text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Sem SDR
                </button>
              </div>

              {/* Candidatos */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {p.candidatos.length} candidato{p.candidatos.length > 1 ? "s" : ""} encontrado{p.candidatos.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-3">
                  {p.candidatos.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-[#141820] rounded-lg px-4 py-3 border border-[#232a3b]"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-100">{c.nomeCliente}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          SDR: {c.sdr.nome} | Vendedora: {c.vendedora.nome} |{" "}
                          Reuniao: {new Date(c.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <button
                        onClick={() => resolver(p.id, "VINCULAR", c.id)}
                        disabled={processando === p.id}
                        className="px-4 py-2 rounded-lg bg-sky-400 text-gray-900 font-medium hover:bg-sky-300 transition text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        <Link2 className="w-4 h-4" />
                        Vincular
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

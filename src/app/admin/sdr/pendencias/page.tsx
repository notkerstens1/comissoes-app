"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Link2, XCircle, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pré-venda · SDR"
        title="Pendências de Vínculo"
        subtitle="Vendas com match ambíguo de SDR"
      />

      {pendencias.length === 0 ? (
        <div className="rounded-2xl border border-liv-line bg-liv-surface p-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-liv-sage" />
          <h3 className="mb-2 text-lg font-medium text-liv-ink">Nenhuma pendência</h3>
          <p className="text-sm text-liv-muted">
            Todas as vendas foram vinculadas automaticamente ou resolvidas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendencias.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-liv-line bg-liv-surface"
            >
              {/* Cabecalho da venda */}
              <div className="flex items-center justify-between border-b border-liv-line px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-liv-gold" />
                    <h3 className="font-semibold text-liv-ink">{p.venda.cliente}</h3>
                  </div>
                  <p className="mt-1 text-sm text-liv-muted">
                    Venda: {formatCurrency(p.venda.valorVenda)} | Vendedora: {p.venda.vendedor.nome} |{" "}
                    {new Date(p.venda.dataConversao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={() => resolver(p.id, "SEM_SDR")}
                  disabled={processando === p.id}
                  className="flex items-center gap-2 rounded-lg border border-liv-line px-4 py-2 text-sm text-liv-muted transition hover:bg-liv-surface-2 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Sem SDR
                </button>
              </div>

              {/* Candidatos */}
              <div className="px-6 py-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">
                  {p.candidatos.length} candidato{p.candidatos.length > 1 ? "s" : ""} encontrado{p.candidatos.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-3">
                  {p.candidatos.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-liv-line bg-liv-surface-2 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-liv-ink">{c.nomeCliente}</p>
                        <p className="mt-0.5 text-xs text-liv-muted">
                          SDR: {c.sdr.nome} | Vendedora: {c.vendedora.nome} |{" "}
                          Reuniao: {new Date(c.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <button
                        onClick={() => resolver(p.id, "VINCULAR", c.id)}
                        disabled={processando === p.id}
                        className="flex items-center gap-2 rounded-lg bg-liv-sage px-4 py-2 text-sm font-medium text-liv-bg transition hover:bg-liv-sage-deep disabled:opacity-50"
                      >
                        <Link2 className="h-4 w-4" />
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

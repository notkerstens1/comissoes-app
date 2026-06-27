"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, CheckCircle, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pré-venda · SDR"
        title="Pagamento SDR"
        subtitle={getNomeMes(mesAtual)}
        actions={
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="rounded-lg border border-liv-line bg-liv-surface-2 px-3 py-2 text-sm text-liv-ink"
          />
        }
      />

      {sdrs.length === 0 ? (
        <div className="rounded-2xl border border-liv-line bg-liv-surface p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-liv-faint" />
          <h3 className="mb-2 text-lg font-medium text-liv-ink">Sem registros neste mes</h3>
          <p className="text-sm text-liv-muted">
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
                className="overflow-hidden rounded-2xl border border-liv-line bg-liv-surface"
              >
                {/* Cabecalho SDR */}
                <div className="flex items-center justify-between border-b border-liv-line px-6 py-4">
                  <div>
                    <h3 className="font-semibold text-liv-ink">{sdr.nome}</h3>
                    <p className="mt-0.5 text-sm text-liv-muted">
                      {sdr.registros.length} registro(s) | {pendentes} pendente(s) | {pagos} pago(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-liv-faint">Pendente</p>
                      <p className="text-lg font-bold tabular-nums text-liv-gold">
                        {formatCurrency(sdr.totalPendente)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-liv-faint">Pago</p>
                      <p className="text-lg font-bold tabular-nums text-liv-sage">
                        {formatCurrency(sdr.totalPago)}
                      </p>
                    </div>
                    {sdr.totalPendente > 0 && (
                      <button
                        onClick={() => marcarPago(sdr.id)}
                        disabled={processando === sdr.id}
                        className="flex items-center gap-2 rounded-lg bg-liv-sage px-4 py-2 text-sm font-medium text-liv-bg transition hover:bg-liv-sage-deep disabled:opacity-50"
                      >
                        {processando === sdr.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg"></div>
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
                    <thead className="bg-liv-surface-2 text-liv-faint">
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em]">Cliente</th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em]">Reuniao</th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em]">Compareceu</th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em]">Venda</th>
                        <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-[0.12em]">Comissao</th>
                        <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-liv-line">
                      {sdr.registros.map((r) => (
                        <tr key={r.id} className="hover:bg-liv-surface-2">
                          <td className="px-4 py-2 text-liv-ink">{r.nomeCliente}</td>
                          <td className="px-4 py-2 text-center text-liv-muted">
                            {new Date(r.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {r.compareceu ? (
                              <CheckCircle className="mx-auto h-4 w-4 text-liv-sage" />
                            ) : (
                              <span className="text-xs text-liv-danger">Nao</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {r.vendaVinculadaId ? (
                              <span className="text-xs text-liv-sage">Sim</span>
                            ) : (
                              <span className="text-xs text-liv-faint">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums text-liv-sage">
                            {formatCurrency(r.comissaoTotal)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                r.statusPagamento === "PAGO"
                                  ? "bg-liv-sage/14 text-liv-sage"
                                  : "bg-liv-gold/12 text-liv-gold"
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

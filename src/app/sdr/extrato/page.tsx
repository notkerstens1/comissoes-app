"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Users, CheckCircle, Zap } from "lucide-react";
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pré-venda · SDR"
        title="Extrato de Comissões"
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

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-liv-line bg-liv-surface p-5">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-liv-sage" />
            <p className="text-sm text-liv-muted">Reunioes</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-liv-ink">
            {resumo?.reunioesComissao ?? 0} x R$ 20,00
          </p>
          <p className="mt-1 text-sm tabular-nums text-liv-sage">
            {formatCurrency(resumo?.totalReuniao ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-liv-line bg-liv-surface p-5">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-liv-sage" />
            <p className="text-sm text-liv-muted">Vendas</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-liv-ink">
            {resumo?.vendasComissao ?? 0} x R$ 20,00
          </p>
          <p className="mt-1 text-sm tabular-nums text-liv-sage">
            {formatCurrency(resumo?.totalVenda ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-liv-sage/30 bg-liv-sage/10 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-liv-sage" />
            <p className="text-sm text-liv-sage">Total</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-liv-ink">
            {formatCurrency(resumo?.totalGeral ?? 0)}
          </p>
        </div>
      </div>

      {/* Tabela detalhada */}
      {registros.length === 0 ? (
        <div className="rounded-2xl border border-liv-line bg-liv-surface p-12 text-center">
          <DollarSign className="mx-auto mb-4 h-12 w-12 text-liv-faint" />
          <h3 className="mb-2 text-lg font-medium text-liv-ink">Sem registros neste mes</h3>
          <p className="text-sm text-liv-muted">
            Suas comissoes aparecerao aqui quando houver registros.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-liv-line bg-liv-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-liv-surface-2 text-liv-faint">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em]">Cliente</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em]">Vendedora</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em]">Data</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em]">Reuniao</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em]">Venda</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em]">Total</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-liv-surface-2">
                    <td className="px-4 py-3">
                      <div className="font-medium text-liv-ink">{r.nomeCliente}</div>
                      {r.vendaVinculada && (
                        <p className="mt-0.5 text-xs tabular-nums text-liv-sage">
                          Venda: {formatCurrency(r.vendaVinculada.valorVenda)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-liv-muted">{r.vendedora.nome}</td>
                    <td className="px-4 py-3 text-center text-liv-muted">
                      {new Date(r.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.comissaoReuniao > 0 ? (
                        <span className="text-liv-sage">{formatCurrency(r.comissaoReuniao)}</span>
                      ) : (
                        <span className="text-liv-faint">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.comissaoVenda > 0 ? (
                        <span className="text-liv-sage">{formatCurrency(r.comissaoVenda)}</span>
                      ) : (
                        <span className="text-liv-faint">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-liv-sage">
                      {formatCurrency(r.comissaoTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
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
              <tfoot className="bg-liv-sage/10 font-semibold text-liv-sage">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>TOTAIS</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(resumo?.totalReuniao ?? 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(resumo?.totalVenda ?? 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(resumo?.totalGeral ?? 0)}</td>
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

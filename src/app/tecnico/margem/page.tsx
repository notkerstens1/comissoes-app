"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { OperacaoNav } from "@/components/OperacaoNav";
import { Activity, Save, Filter, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { canAccessTecnico } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";

interface VendaInstalacao {
  id: string;
  cliente: string;
  dataConversao: string;
  valorVenda: number;
  cidadeInstalacao: string | null;
  bitolaCabo: string | null;
  metragemCaboPrevista: number | null;
  inversorTrifasico: boolean;
  custoInstalacaoEstimado: number | null;
  custoInstalacaoReal: number | null;
  statusMargemInstalacao: "VERDE" | "AMARELO" | "VERMELHO" | null;
  observacaoMargemInstalacao: string | null;
  vendedor: { nome: string } | null;
}

interface Resumo {
  total: number;
  concluidas: number;
  verde: number;
  amarelo: number;
  vermelho: number;
  totalEstimado: number;
  totalReal: number;
  delta: number;
}

function getMesAtualRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

const statusColors: Record<string, string> = {
  VERDE:    "bg-liv-sage/15 text-liv-sage border-liv-sage/30",
  AMARELO:  "bg-liv-gold/15 text-liv-gold border-liv-gold/30",
  VERMELHO: "bg-liv-danger/15 text-liv-danger border-liv-danger/30",
};

export default function MargemPage() {
  const { data: session, status } = useSession();
  const initial = getMesAtualRange();
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [vendas, setVendas] = useState<VendaInstalacao[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReal, setEditReal] = useState("");
  const [editObs, setEditObs] = useState("");
  const autorizado = status === "authenticated" && canAccessTecnico(session?.user?.role);

  useEffect(() => {
    if (!autorizado) return;
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (filterStatus) params.set("status", filterStatus);
    fetch(`/api/tecnico/margem-instalacoes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVendas(d.vendas);
        setResumo(d.resumo);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, filterStatus, autorizado]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage" />
      </div>
    );
  }
  if (!autorizado) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-liv-danger py-12">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Acesso negado.
        </div>
      </div>
    );
  }

  async function salvarReal(id: string) {
    await fetch(`/api/tecnico/margem-instalacoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        custoInstalacaoReal: parseFloat(editReal),
        observacaoMargemInstalacao: editObs.trim() || undefined,
      }),
    });
    setEditingId(null);
    setEditReal("");
    setEditObs("");
    // Refresh
    const params = new URLSearchParams({ startDate, endDate });
    if (filterStatus) params.set("status", filterStatus);
    const r = await fetch(`/api/tecnico/margem-instalacoes?${params}`);
    const d = await r.json();
    setVendas(d.vendas);
    setResumo(d.resumo);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação · Setor Técnico"
        title="Margem de Instalação"
        subtitle={`${resumo?.total ?? 0} instalacoes com dados de engenharia · ${resumo?.concluidas ?? 0} concluidas`}
        actions={
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink"
            />
            <span className="text-liv-faint text-sm">ate</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink"
            />
          </div>
        }
      />

      <div className="max-w-6xl mx-auto space-y-6">
        <OperacaoNav />

        {/* Cards de resumo */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card label="Total estimado" value={formatCurrency(resumo.totalEstimado)} hint="custo previsto" />
            <Card label="Total real" value={formatCurrency(resumo.totalReal)} hint={`${resumo.concluidas} concluidas`} />
            <Card
              label="Delta (real - estimado)"
              value={formatCurrency(resumo.delta)}
              hint={resumo.delta > 0 ? "estourou" : "dentro/sobrou"}
              valueClass={resumo.delta > 0 ? "text-liv-danger" : "text-liv-sage"}
            />
            <Card label="Verde / Amarelo / Vermelho" value={`${resumo.verde} / ${resumo.amarelo} / ${resumo.vermelho}`} hint="distribuicao" />
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus("")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              filterStatus === "" ? "bg-liv-teal text-liv-bg" : "bg-liv-surface-2 text-liv-muted"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Todos
          </button>
          {["VERDE", "AMARELO", "VERMELHO"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterStatus === s ? statusColors[s] : "bg-liv-surface-2 text-liv-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage" />
          </div>
        ) : vendas.length === 0 ? (
          <div className="text-center text-liv-faint py-12 bg-liv-surface rounded-xl border border-liv-line">
            Nenhuma instalacao com dados de engenharia neste periodo.
          </div>
        ) : (
          <div className="bg-liv-surface rounded-xl border border-liv-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-liv-surface-2 text-liv-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Cidade</th>
                    <th className="text-center px-4 py-3 font-medium">Cabo</th>
                    <th className="text-center px-4 py-3 font-medium">Trif.</th>
                    <th className="text-right px-4 py-3 font-medium">Estimado</th>
                    <th className="text-right px-4 py-3 font-medium">Real</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-center px-4 py-3 font-medium">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-liv-line">
                  {vendas.map((v) => {
                    const isEditing = editingId === v.id;
                    return (
                      <tr key={v.id} className="hover:bg-liv-surface-2">
                        <td className="px-4 py-3 font-medium text-liv-ink">
                          {v.cliente}
                          <span className="block text-[10px] text-liv-faint">
                            {v.vendedor?.nome ?? "-"} · {new Date(v.dataConversao).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-liv-muted">{v.cidadeInstalacao ?? "-"}</td>
                        <td className="px-4 py-3 text-center text-liv-muted">
                          {v.metragemCaboPrevista}m · {v.bitolaCabo}
                        </td>
                        <td className="px-4 py-3 text-center text-liv-muted">{v.inversorTrifasico ? "sim" : "-"}</td>
                        <td className="px-4 py-3 text-right text-liv-muted tabular-nums">
                          {v.custoInstalacaoEstimado ? formatCurrency(v.custoInstalacaoEstimado) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editReal}
                              onChange={(e) => setEditReal(e.target.value)}
                              className="w-24 px-2 py-1 rounded border border-liv-sage/50 bg-liv-surface-2 text-liv-ink text-sm text-right"
                              autoFocus
                            />
                          ) : v.custoInstalacaoReal ? (
                            <span className="text-liv-ink font-medium tabular-nums">{formatCurrency(v.custoInstalacaoReal)}</span>
                          ) : (
                            <span className="text-liv-faint">pendente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {v.statusMargemInstalacao ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[v.statusMargemInstalacao]}`}>
                              {v.statusMargemInstalacao}
                            </span>
                          ) : (
                            <span className="text-liv-faint text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={editObs}
                                onChange={(e) => setEditObs(e.target.value)}
                                placeholder="observacao..."
                                className="px-2 py-1 rounded border border-liv-line bg-liv-surface-2 text-liv-ink text-xs"
                              />
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => salvarReal(v.id)}
                                  className="px-2 py-1 rounded bg-liv-sage text-liv-bg text-xs font-medium"
                                >
                                  <Save className="w-3 h-3 inline" /> Salvar
                                </button>
                                <button
                                  onClick={() => { setEditingId(null); setEditReal(""); setEditObs(""); }}
                                  className="px-2 py-1 rounded border border-liv-line text-liv-muted text-xs"
                                >
                                  X
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(v.id);
                                setEditReal(v.custoInstalacaoReal ? String(v.custoInstalacaoReal) : "");
                                setEditObs(v.observacaoMargemInstalacao ?? "");
                              }}
                              className="text-liv-teal hover:text-liv-teal/70 text-xs font-medium"
                            >
                              {v.custoInstalacaoReal ? "editar" : "lancar real"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, hint, valueClass }: { label: string; value: string; hint: string; valueClass?: string }) {
  return (
    <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
      <p className="text-xs text-liv-muted">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${valueClass ?? "text-liv-ink"}`}>{value}</p>
      <p className="text-[10px] text-liv-faint mt-1">{hint}</p>
    </div>
  );
}

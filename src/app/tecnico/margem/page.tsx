"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";
import { Activity, Save, Filter, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { canAccessTecnico } from "@/lib/roles";

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
  VERDE:    "bg-lime-400/15 text-lime-400 border-lime-400/30",
  AMARELO:  "bg-amber-400/15 text-amber-400 border-amber-400/30",
  VERMELHO: "bg-red-400/15 text-red-400 border-red-400/30",
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
      <div className="flex min-h-screen bg-[#0b0f19]">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6">
          <div className="text-center text-gray-500 py-12">Carregando...</div>
        </main>
      </div>
    );
  }
  if (!autorizado) {
    return (
      <div className="flex min-h-screen bg-[#0b0f19]">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6">
          <div className="text-center text-red-400 py-12">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            Acesso negado.
          </div>
        </main>
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
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <Activity className="w-6 h-6 text-teal-400" />
                Margem de Instalacao
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {resumo?.total ?? 0} instalacoes com dados de engenharia · {resumo?.concluidas ?? 0} concluidas
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
              />
              <span className="text-gray-500 text-sm">ate</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
              />
            </div>
          </div>

          {/* Cards de resumo */}
          {resumo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card label="Total estimado" value={formatCurrency(resumo.totalEstimado)} hint="custo previsto" />
              <Card label="Total real" value={formatCurrency(resumo.totalReal)} hint={`${resumo.concluidas} concluidas`} />
              <Card
                label="Delta (real - estimado)"
                value={formatCurrency(resumo.delta)}
                hint={resumo.delta > 0 ? "estourou" : "dentro/sobrou"}
                valueClass={resumo.delta > 0 ? "text-red-400" : "text-lime-400"}
              />
              <Card label="Verde / Amarelo / Vermelho" value={`${resumo.verde} / ${resumo.amarelo} / ${resumo.vermelho}`} hint="distribuicao" />
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus("")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterStatus === "" ? "bg-teal-400 text-gray-900" : "bg-[#232a3b] text-gray-300"
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
                  filterStatus === s ? statusColors[s] : "bg-[#232a3b] text-gray-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">Carregando...</div>
          ) : vendas.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-[#1a1f2e] rounded-xl border border-[#232a3b]">
              Nenhuma instalacao com dados de engenharia neste periodo.
            </div>
          ) : (
            <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#141820] text-gray-400">
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
                  <tbody className="divide-y divide-[#232a3b]">
                    {vendas.map((v) => {
                      const isEditing = editingId === v.id;
                      return (
                        <tr key={v.id} className="hover:bg-[#232a3b]/30">
                          <td className="px-4 py-3 font-medium text-gray-100">
                            {v.cliente}
                            <span className="block text-[10px] text-gray-500">
                              {v.vendedor?.nome ?? "-"} · {new Date(v.dataConversao).toLocaleDateString("pt-BR")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{v.cidadeInstalacao ?? "-"}</td>
                          <td className="px-4 py-3 text-center text-gray-300">
                            {v.metragemCaboPrevista}m · {v.bitolaCabo}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-300">{v.inversorTrifasico ? "sim" : "-"}</td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {v.custoInstalacaoEstimado ? formatCurrency(v.custoInstalacaoEstimado) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editReal}
                                onChange={(e) => setEditReal(e.target.value)}
                                className="w-24 px-2 py-1 rounded border border-teal-400/50 bg-[#141820] text-gray-100 text-sm text-right"
                                autoFocus
                              />
                            ) : v.custoInstalacaoReal ? (
                              <span className="text-gray-100 font-medium">{formatCurrency(v.custoInstalacaoReal)}</span>
                            ) : (
                              <span className="text-gray-600">pendente</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.statusMargemInstalacao ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[v.statusMargemInstalacao]}`}>
                                {v.statusMargemInstalacao}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">-</span>
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
                                  className="px-2 py-1 rounded border border-[#232a3b] bg-[#141820] text-gray-100 text-xs"
                                />
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => salvarReal(v.id)}
                                    className="px-2 py-1 rounded bg-teal-400 text-gray-900 text-xs font-medium"
                                  >
                                    <Save className="w-3 h-3 inline" /> Salvar
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setEditReal(""); setEditObs(""); }}
                                    className="px-2 py-1 rounded border border-[#232a3b] text-gray-400 text-xs"
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
                                className="text-teal-400 hover:text-teal-300 text-xs font-medium"
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
      </main>
    </div>
  );
}

function Card({ label, value, hint, valueClass }: { label: string; value: string; hint: string; valueClass?: string }) {
  return (
    <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b]">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueClass ?? "text-gray-100"}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-1">{hint}</p>
    </div>
  );
}

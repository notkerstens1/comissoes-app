"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck, Calendar, AlertCircle, Phone, RefreshCw, Check, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ETAPAS_POS_VENDA, ETAPA_CORES, getEtapaLabel, type EtapaPosVenda } from "@/lib/pos-venda";

type PosVendaRegistro = {
  id: string;
  nomeCliente: string;
  telefone: string | null;
  etapa: string;
  ultimaAcao: string | null;
  proximaAcao: string | null;
  observacoes: string | null;
  ultimoContato: string | null;
  proximoContato: string | null;
  createdAt: string;
  operador: { id: string; nome: string };
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function AdminPosVendaPage() {
  const [registros, setRegistros] = useState<PosVendaRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEtapa, setFiltroEtapa] = useState("TODAS");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "semana" | "mes">("todos");
  const [trocandoEtapaId, setTrocandoEtapaId] = useState<string | null>(null);
  const [novaEtapaSel, setNovaEtapaSel] = useState("");
  const [savingEtapa, setSavingEtapa] = useState(false);

  const hoje = new Date().toISOString().split("T")[0];

  const getInicioSemana = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
  };
  const getFimSemana = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
  };
  const getInicioMes = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  };
  const getFimMes = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  };

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pos-venda");
      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  // Filtrar por periodo primeiro
  let registrosPeriodo = registros;
  if (filtroPeriodo === "semana") {
    const inicio = getInicioSemana();
    const fim = getFimSemana();
    registrosPeriodo = registrosPeriodo.filter((r) => {
      const d = r.createdAt?.split("T")[0];
      return d && d >= inicio && d <= fim;
    });
  } else if (filtroPeriodo === "mes") {
    const inicio = getInicioMes();
    const fim = getFimMes();
    registrosPeriodo = registrosPeriodo.filter((r) => {
      const d = r.createdAt?.split("T")[0];
      return d && d >= inicio && d <= fim;
    });
  }

  const filtrados = filtroEtapa === "TODAS"
    ? registrosPeriodo
    : registrosPeriodo.filter((r) => r.etapa === filtroEtapa);

  // Contadores por etapa (baseados no periodo filtrado)
  const contadores = ETAPAS_POS_VENDA.reduce((acc, et) => {
    acc[et.key] = registrosPeriodo.filter((r) => r.etapa === et.key).length;
    return acc;
  }, {} as Record<string, number>);

  const vencidos = registrosPeriodo.filter((r) => r.proximoContato && r.proximoContato < hoje).length;

  async function salvarTrocaEtapa(id: string) {
    setSavingEtapa(true);
    try {
      await fetch(`/api/pos-venda/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: novaEtapaSel }),
      });
      setTrocandoEtapaId(null);
      await fetchRegistros();
    } finally {
      setSavingEtapa(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-orange-400" />
              Visão Pós Venda
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Acompanhamento de todos os clientes em pós-instalação
            </p>
          </div>

          {/* Filtro de periodo */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <span className="text-xs text-gray-500 self-center mr-1">Periodo:</span>
            {([["todos", "Todos"], ["semana", "Esta Semana"], ["mes", "Este Mes"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFiltroPeriodo(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filtroPeriodo === key
                    ? "bg-sky-400 text-gray-900"
                    : "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cards por etapa */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2 mb-6">
            {ETAPAS_POS_VENDA.map((et) => {
              const cores = ETAPA_CORES[et.key];
              return (
                <button
                  key={et.key}
                  onClick={() => setFiltroEtapa(filtroEtapa === et.key ? "TODAS" : et.key)}
                  className={`rounded-xl p-3 text-left transition border ${
                    filtroEtapa === et.key
                      ? `${cores.bg} ${cores.border}`
                      : "bg-[#1a1f2e] border-[#232a3b] hover:border-[#2a3040]"
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1 ${filtroEtapa === et.key ? cores.text : "text-gray-500"}`}>
                    {et.label}
                  </p>
                  <p className={`text-xl font-bold ${filtroEtapa === et.key ? cores.text : "text-gray-300"}`}>
                    {contadores[et.key] ?? 0}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Alerta de vencidos */}
          {vencidos > 0 && (
            <div className="flex items-center gap-3 bg-rose-400/10 border border-rose-400/30 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">
                <span className="font-semibold">{vencidos} cliente{vencidos > 1 ? "s" : ""}</span> com próximo contato vencido
              </p>
              <button
                onClick={() => setFiltroEtapa("TODAS")}
                className="ml-auto text-xs text-rose-400 hover:text-rose-300 underline"
              >
                ver todos
              </button>
            </div>
          )}

          {/* Filtro ativo */}
          {filtroEtapa !== "TODAS" && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-400">Filtrando por:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ETAPA_CORES[filtroEtapa].bg} ${ETAPA_CORES[filtroEtapa].text}`}>
                {getEtapaLabel(filtroEtapa)}
              </span>
              <button onClick={() => setFiltroEtapa("TODAS")} className="text-xs text-gray-500 hover:text-gray-300 underline">
                limpar
              </button>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#232a3b] bg-[#141820]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Etapa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Última Ação</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Próxima Ação</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Próx. Contato</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Observações</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Etapa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232a3b]">
                    {filtrados
                      .sort((a, b) => {
                        // vencidos primeiro
                        const aVencido = a.proximoContato && a.proximoContato < hoje ? 0 : 1;
                        const bVencido = b.proximoContato && b.proximoContato < hoje ? 0 : 1;
                        if (aVencido !== bVencido) return aVencido - bVencido;
                        return (a.proximoContato ?? "").localeCompare(b.proximoContato ?? "");
                      })
                      .map((r) => {
                        const vencido = r.proximoContato && r.proximoContato < hoje;
                        const cores = ETAPA_CORES[r.etapa];
                        return (
                          <tr key={r.id} className={`hover:bg-[#141820] transition ${vencido ? "bg-rose-400/5" : ""}`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-100">{r.nomeCliente}</p>
                              {r.telefone && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {r.telefone}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cores.bg} ${cores.text}`}>
                                {getEtapaLabel(r.etapa)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px]">
                              {r.ultimaAcao ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-orange-300 text-xs font-medium max-w-[180px]">
                              {r.proximaAcao ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1 text-xs font-medium ${vencido ? "text-rose-400" : "text-gray-300"}`}>
                                {vencido && <AlertCircle className="w-3 h-3" />}
                                <Calendar className="w-3 h-3" />
                                {formatDate(r.proximoContato)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                              {r.observacoes ?? "—"}
                            </td>
                            {/* Troca rápida de etapa */}
                            <td className="px-4 py-3">
                              {trocandoEtapaId === r.id ? (
                                <div className="flex items-center gap-1.5 min-w-[260px]">
                                  <select
                                    value={novaEtapaSel}
                                    onChange={(e) => setNovaEtapaSel(e.target.value)}
                                    className="flex-1 bg-[#0b0f19] border border-orange-400/50 rounded px-2 py-1 text-xs text-gray-100 focus:border-orange-400 outline-none"
                                  >
                                    {ETAPAS_POS_VENDA.map((et) => (
                                      <option key={et.key} value={et.key}>{et.label}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => salvarTrocaEtapa(r.id)}
                                    disabled={savingEtapa}
                                    className="p-1.5 bg-orange-400 text-gray-900 rounded hover:bg-orange-300 disabled:opacity-50 transition"
                                    title="Salvar"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setTrocandoEtapaId(null)}
                                    className="p-1.5 bg-[#232a3b] text-gray-400 rounded hover:bg-[#2a3040] transition"
                                    title="Cancelar"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setTrocandoEtapaId(r.id);
                                    setNovaEtapaSel(r.etapa as EtapaPosVenda);
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-sky-400 bg-sky-400/10 rounded border border-sky-400/20 hover:bg-sky-400/20 transition font-medium"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Alterar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

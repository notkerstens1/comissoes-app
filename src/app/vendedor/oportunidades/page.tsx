"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Target,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { formatCurrency } from "@/lib/utils";

const ESTAGIOS = [
  { key: "REUNIAO",    label: "Reunião",      cor: "bg-sky-400/10 text-sky-400" },
  { key: "PROPOSTA",   label: "Proposta",     cor: "bg-amber-400/10 text-amber-400" },
  { key: "NEGOCIACAO", label: "Negociação",   cor: "bg-orange-400/10 text-orange-400" },
  { key: "FECHADA",    label: "Fechada ✓",    cor: "bg-emerald-400/10 text-emerald-400" },
];

type Registro = {
  id: string;
  nomeCliente: string;
  dataReuniao: string;
  statusLead: string;
  valorForecast: number | null;
  estagioOportunidade: string;
  probabilidade: number;
  dataFechamentoEsperado: string | null;
  sdr: { nome: string };
  compareceu: boolean;
};

type EditState = {
  valorForecast: string;
  estagioOportunidade: string;
  probabilidade: string;
  dataFechamentoEsperado: string;
};

export default function MinhasOportunidades() {
  const { data: session } = useSession();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [totalForecast, setTotalForecast] = useState(0);
  const [totalPonderado, setTotalPonderado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditState>({
    valorForecast: "",
    estagioOportunidade: "REUNIAO",
    probabilidade: "50",
    dataFechamentoEsperado: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchOportunidades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendedor/oportunidades");
      const data = await res.json();
      setRegistros(data.registros ?? []);
      setTotalForecast(data.totalForecast ?? 0);
      setTotalPonderado(data.totalPonderado ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOportunidades();
  }, [fetchOportunidades]);

  function startEdit(r: Registro) {
    setEditingId(r.id);
    setEditData({
      valorForecast: r.valorForecast != null ? String(r.valorForecast) : "",
      estagioOportunidade: r.estagioOportunidade,
      probabilidade: String(r.probabilidade),
      dataFechamentoEsperado: r.dataFechamentoEsperado ?? "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await fetch("/api/vendedor/oportunidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registroId: id,
          valorForecast: editData.valorForecast ? Number(editData.valorForecast) : null,
          estagioOportunidade: editData.estagioOportunidade,
          probabilidade: Number(editData.probabilidade),
          dataFechamentoEsperado: editData.dataFechamentoEsperado || null,
        }),
      });
      setEditingId(null);
      await fetchOportunidades();
    } finally {
      setSaving(false);
    }
  }

  function getEstagioStyle(key: string) {
    return ESTAGIOS.find((e) => e.key === key)?.cor ?? "bg-gray-400/10 text-gray-400";
  }
  function getEstagioLabel(key: string) {
    return ESTAGIOS.find((e) => e.key === key)?.label ?? key;
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Target className="w-6 h-6 text-lime-400" />
              Minhas Oportunidades
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Leads qualificados pelo SDR destinados a você
            </p>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Oportunidades</p>
              <p className="text-2xl font-bold text-lime-400">{registros.length}</p>
              <p className="text-xs text-gray-500 mt-1">abertas no momento</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Forecast Total</p>
              <p className="text-2xl font-bold text-lime-400">{formatCurrency(totalForecast)}</p>
              <p className="text-xs text-gray-500 mt-1">soma dos valores estimados</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Forecast Ponderado</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPonderado)}</p>
              <p className="text-xs text-gray-500 mt-1">valor × probabilidade</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : registros.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma oportunidade aberta no momento</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#232a3b] bg-[#141820]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reunião</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor Forecast</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estágio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prob.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fechamento</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232a3b]">
                    {registros.map((r) => {
                      const vencido = r.dataFechamentoEsperado && r.dataFechamentoEsperado < hoje;
                      const isEditing = editingId === r.id;

                      return (
                        <>
                          <tr key={r.id} className={`hover:bg-[#141820] transition ${vencido ? "opacity-75" : ""}`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-100">{r.nomeCliente}</p>
                              <p className="text-xs text-gray-500">SDR: {r.sdr.nome}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{formatDate(r.dataReuniao)}</td>
                            <td className="px-4 py-3">
                              {r.valorForecast != null ? (
                                <span className="text-lime-400 font-medium">{formatCurrency(r.valorForecast)}</span>
                              ) : (
                                <span className="text-gray-600 italic text-xs">não informado</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getEstagioStyle(r.estagioOportunidade)}`}>
                                {getEstagioLabel(r.estagioOportunidade)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${r.probabilidade >= 70 ? "text-emerald-400" : r.probabilidade >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                                {r.probabilidade}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={vencido ? "text-rose-400 text-xs font-medium" : "text-gray-300 text-xs"}>
                                {formatDate(r.dataFechamentoEsperado)}
                                {vencido && " ⚠️"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => isEditing ? setEditingId(null) : startEdit(r)}
                                className="p-1.5 rounded-lg hover:bg-[#232a3b] text-gray-400 hover:text-gray-100 transition"
                              >
                                {isEditing ? <ChevronUp className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Inline edit row */}
                          {isEditing && (
                            <tr key={`${r.id}-edit`} className="bg-[#141820]">
                              <td colSpan={7} className="px-4 py-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Valor Forecast (R$)</label>
                                    <input
                                      type="number"
                                      value={editData.valorForecast}
                                      onChange={(e) => setEditData((p) => ({ ...p, valorForecast: e.target.value }))}
                                      className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-lime-400 outline-none"
                                      placeholder="Ex: 45000"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Estágio</label>
                                    <select
                                      value={editData.estagioOportunidade}
                                      onChange={(e) => setEditData((p) => ({ ...p, estagioOportunidade: e.target.value }))}
                                      className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-lime-400 outline-none"
                                    >
                                      {ESTAGIOS.map((e) => (
                                        <option key={e.key} value={e.key}>{e.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Probabilidade (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editData.probabilidade}
                                      onChange={(e) => setEditData((p) => ({ ...p, probabilidade: e.target.value }))}
                                      className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-lime-400 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Data Fechamento</label>
                                    <input
                                      type="date"
                                      value={editData.dataFechamentoEsperado}
                                      onChange={(e) => setEditData((p) => ({ ...p, dataFechamentoEsperado: e.target.value }))}
                                      className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-lime-400 outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => saveEdit(r.id)}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-lime-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-lime-300 disabled:opacity-50 transition"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {saving ? "Salvando..." : "Salvar"}
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-[#232a3b] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#2a3040] transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
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

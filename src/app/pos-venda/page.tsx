"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Plus,
  ChevronRight,
  Pencil,
  X,
  Check,
  Phone,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import {
  ETAPAS_POS_VENDA,
  ETAPA_CORES,
  getEtapaLabel,
  getProximaEtapa,
  type EtapaPosVenda,
} from "@/lib/pos-venda";

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
  operador: { id: string; nome: string };
};

type FormData = {
  nomeCliente: string;
  telefone: string;
  etapa: string;
  ultimaAcao: string;
  proximaAcao: string;
  observacoes: string;
  ultimoContato: string;
  proximoContato: string;
};

const FORM_INICIAL: FormData = {
  nomeCliente: "",
  telefone: "",
  etapa: "TRAMITES",
  ultimaAcao: "",
  proximaAcao: "",
  observacoes: "",
  ultimoContato: "",
  proximoContato: "",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function PosVendaPage() {
  const [registros, setRegistros] = useState<PosVendaRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(FORM_INICIAL);
  const [saving, setSaving] = useState(false);

  const hoje = new Date().toISOString().split("T")[0];

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

  async function handleCreate() {
    if (!form.nomeCliente.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/pos-venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(FORM_INICIAL);
      setShowForm(false);
      await fetchRegistros();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r: PosVendaRegistro) {
    setEditingId(r.id);
    setEditForm({
      nomeCliente: r.nomeCliente,
      telefone: r.telefone ?? "",
      etapa: r.etapa,
      ultimaAcao: r.ultimaAcao ?? "",
      proximaAcao: r.proximaAcao ?? "",
      observacoes: r.observacoes ?? "",
      ultimoContato: r.ultimoContato ?? "",
      proximoContato: r.proximoContato ?? "",
    });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/pos-venda/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      await fetchRegistros();
    } finally {
      setSaving(false);
    }
  }

  async function handleAvancar(r: PosVendaRegistro) {
    const proxima = getProximaEtapa(r.etapa as EtapaPosVenda);
    if (!proxima) return;
    await fetch(`/api/pos-venda/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: proxima }),
    });
    await fetchRegistros();
  }

  // Agrupar por etapa
  const porEtapa = ETAPAS_POS_VENDA.reduce((acc, et) => {
    acc[et.key] = registros.filter((r) => r.etapa === et.key);
    return acc;
  }, {} as Record<string, PosVendaRegistro[]>);

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-orange-400" />
                Pós Venda
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Acompanhamento de clientes pós-instalação solar
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-400 text-gray-900 rounded-xl font-semibold text-sm hover:bg-orange-300 transition"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>

          {/* Formulário novo cliente */}
          {showForm && (
            <div className="bg-[#1a1f2e] border border-orange-400/30 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-4">
                Novo Cliente
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Cliente *</label>
                  <input
                    value={form.nomeCliente}
                    onChange={(e) => setForm((p) => ({ ...p, nomeCliente: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                    placeholder="(84) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Etapa Inicial</label>
                  <select
                    value={form.etapa}
                    onChange={(e) => setForm((p) => ({ ...p, etapa: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                  >
                    {ETAPAS_POS_VENDA.map((et) => (
                      <option key={et.key} value={et.key}>{et.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Última Ação</label>
                  <input
                    value={form.ultimaAcao}
                    onChange={(e) => setForm((p) => ({ ...p, ultimaAcao: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                    placeholder="Ex: Confirmei instalação"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Próxima Ação</label>
                  <input
                    value={form.proximaAcao}
                    onChange={(e) => setForm((p) => ({ ...p, proximaAcao: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                    placeholder="Ex: Enviar relatório"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <input
                    value={form.observacoes}
                    onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                    placeholder="Notas adicionais"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Último Contato</label>
                  <input
                    type="date"
                    value={form.ultimoContato}
                    onChange={(e) => setForm((p) => ({ ...p, ultimoContato: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Próximo Contato</label>
                  <input
                    type="date"
                    value={form.proximoContato}
                    onChange={(e) => setForm((p) => ({ ...p, proximoContato: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.nomeCliente.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-orange-300 disabled:opacity-50 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? "Salvando..." : "Cadastrar"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setForm(FORM_INICIAL); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#232a3b] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#2a3040] transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Kanban por etapas */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">Carregando clientes...</div>
          ) : (
            <div className="space-y-4">
              {ETAPAS_POS_VENDA.map((etapa) => {
                const clientes = porEtapa[etapa.key] ?? [];
                const cores = ETAPA_CORES[etapa.key];
                if (clientes.length === 0 && etapa.key === "CONCLUIDA") return null;

                return (
                  <div key={etapa.key} className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
                    {/* Header da etapa */}
                    <div className={`flex items-center gap-3 px-5 py-3 border-b border-[#232a3b] ${cores.bg}`}>
                      <span className={`text-sm font-semibold ${cores.text}`}>{etapa.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cores.bg} ${cores.text} ${cores.border}`}>
                        {clientes.length}
                      </span>
                    </div>

                    {clientes.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-600 italic">Nenhum cliente nesta etapa</div>
                    ) : (
                      <div className="divide-y divide-[#232a3b]">
                        {clientes.map((r) => {
                          const isEditing = editingId === r.id;
                          const vencido = r.proximoContato && r.proximoContato < hoje;

                          return (
                            <div key={r.id}>
                              {/* Card */}
                              <div className="px-5 py-4 hover:bg-[#141820] transition">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-gray-100">{r.nomeCliente}</p>
                                      {r.telefone && (
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                          <Phone className="w-3 h-3" />
                                          {r.telefone}
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 mt-2">
                                      {r.ultimaAcao && (
                                        <div>
                                          <p className="text-xs text-gray-600">Última ação</p>
                                          <p className="text-xs text-gray-300">{r.ultimaAcao}</p>
                                        </div>
                                      )}
                                      {r.proximaAcao && (
                                        <div>
                                          <p className="text-xs text-gray-600">Próxima ação</p>
                                          <p className="text-xs text-orange-300 font-medium">{r.proximaAcao}</p>
                                        </div>
                                      )}
                                      {r.observacoes && (
                                        <div>
                                          <p className="text-xs text-gray-600">Observações</p>
                                          <p className="text-xs text-gray-400">{r.observacoes}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                      <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        Último: {formatDate(r.ultimoContato)}
                                      </span>
                                      <span className={`flex items-center gap-1 text-xs font-medium ${vencido ? "text-rose-400" : "text-gray-500"}`}>
                                        {vencido && <AlertCircle className="w-3 h-3" />}
                                        Próximo: {formatDate(r.proximoContato)}
                                        {vencido && " ⚠️"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Ações */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {etapa.key !== "CONCLUIDA" && (
                                      <button
                                        onClick={() => handleAvancar(r)}
                                        title={`Avançar para ${getEtapaLabel(getProximaEtapa(r.etapa as EtapaPosVenda) ?? "")}`}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${cores.border} ${cores.text} hover:${cores.bg}`}
                                      >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                        Avançar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => isEditing ? setEditingId(null) : startEdit(r)}
                                      className="p-1.5 rounded-lg hover:bg-[#232a3b] text-gray-400 hover:text-gray-100 transition"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Edição inline */}
                              {isEditing && (
                                <div className="px-5 py-4 bg-[#141820] border-t border-[#232a3b]">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Nome</label>
                                      <input value={editForm.nomeCliente} onChange={(e) => setEditForm((p) => ({ ...p, nomeCliente: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                                      <input value={editForm.telefone} onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Etapa</label>
                                      <select value={editForm.etapa} onChange={(e) => setEditForm((p) => ({ ...p, etapa: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none">
                                        {ETAPAS_POS_VENDA.map((et) => <option key={et.key} value={et.key}>{et.label}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Última Ação</label>
                                      <input value={editForm.ultimaAcao} onChange={(e) => setEditForm((p) => ({ ...p, ultimaAcao: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Próxima Ação</label>
                                      <input value={editForm.proximaAcao} onChange={(e) => setEditForm((p) => ({ ...p, proximaAcao: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Observações</label>
                                      <input value={editForm.observacoes} onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Último Contato</label>
                                      <input type="date" value={editForm.ultimoContato} onChange={(e) => setEditForm((p) => ({ ...p, ultimoContato: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Próximo Contato</label>
                                      <input type="date" value={editForm.proximoContato} onChange={(e) => setEditForm((p) => ({ ...p, proximoContato: e.target.value }))} className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none" />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-3">
                                    <button onClick={() => handleSaveEdit(r.id)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-orange-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-orange-300 disabled:opacity-50 transition">
                                      <Check className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar"}
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-4 py-2 bg-[#232a3b] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#2a3040] transition">
                                      <X className="w-3.5 h-3.5" /> Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

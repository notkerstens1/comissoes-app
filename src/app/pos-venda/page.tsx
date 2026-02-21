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
  Filter,
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
  const [filterEtapa, setFilterEtapa] = useState<string | null>(null);

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

  // Filtrar registros
  let clientesFiltrados = registros;
  if (filterEtapa) {
    clientesFiltrados = registros.filter((r) => r.etapa === filterEtapa);
  }

  // Ordenar: vencidos primeiro, depois por próximo contato
  clientesFiltrados = [...clientesFiltrados].sort((a, b) => {
    const aVencido = a.proximoContato && a.proximoContato < hoje;
    const bVencido = b.proximoContato && b.proximoContato < hoje;
    if (aVencido && !bVencido) return -1;
    if (!aVencido && bVencido) return 1;
    return (a.proximoContato || "9999-99-99").localeCompare(
      b.proximoContato || "9999-99-99"
    );
  });

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-orange-400" />
                Pós Venda
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {clientesFiltrados.length} clientes
                {filterEtapa && ` em "${getEtapaLabel(filterEtapa as EtapaPosVenda)}"`}
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

          {/* Filtros por etapa */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterEtapa(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !filterEtapa
                  ? "bg-orange-400 text-gray-900"
                  : "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Todos ({registros.length})
            </button>
            {ETAPAS_POS_VENDA.map((et) => {
              const count = registros.filter((r) => r.etapa === et.key).length;
              if (count === 0) return null;
              const cores = ETAPA_CORES[et.key];
              return (
                <button
                  key={et.key}
                  onClick={() => setFilterEtapa(et.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterEtapa === et.key
                      ? `${cores.bg} ${cores.text}`
                      : "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
                  }`}
                >
                  {et.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista de cards */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">Carregando clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-[#1a1f2e] rounded-xl border border-[#232a3b]">
              Nenhum cliente encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {clientesFiltrados.map((r) => {
                const isEditing = editingId === r.id;
                const vencido = r.proximoContato && r.proximoContato < hoje;
                const cores = ETAPA_CORES[r.etapa];

                return (
                  <div key={r.id}>
                    {/* Card */}
                    {!isEditing && (
                      <div
                        className={`bg-[#1a1f2e] border-2 rounded-xl p-5 transition ${
                          vencido
                            ? "border-rose-500/50 shadow-lg shadow-rose-500/10"
                            : "border-[#232a3b] hover:border-[#2a3050]"
                        }`}
                      >
                        {/* Cabeçalho: Nome + Etapa + Status */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-100">
                              {r.nomeCliente}
                            </h3>
                            {r.telefone && (
                              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                <Phone className="w-4 h-4" />
                                {r.telefone}
                              </div>
                            )}
                          </div>

                          {/* Badges: Etapa + Status */}
                          <div className="flex gap-2 flex-shrink-0">
                            <span
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cores.bg} ${cores.text}`}
                            >
                              {getEtapaLabel(r.etapa as EtapaPosVenda)}
                            </span>
                            {vencido && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <AlertCircle className="w-4 h-4" />
                                Vencido
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* Coluna 1 */}
                          <div className="space-y-3">
                            {r.ultimaAcao && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                  Última ação
                                </p>
                                <p className="text-sm text-gray-300">{r.ultimaAcao}</p>
                              </div>
                            )}
                            {r.ultimoContato && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                  Último contato
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  {formatDate(r.ultimoContato)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Coluna 2 */}
                          <div className="space-y-3">
                            {r.proximaAcao && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                  Próxima ação
                                </p>
                                <p className="text-sm text-orange-300 font-medium">{r.proximaAcao}</p>
                              </div>
                            )}
                            {r.proximoContato && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                  Próximo contato
                                </p>
                                <div
                                  className={`flex items-center gap-2 text-sm font-bold ${
                                    vencido ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                >
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(r.proximoContato)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Observações */}
                        {r.observacoes && (
                          <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                              Observações
                            </p>
                            <p className="text-sm text-gray-300">{r.observacoes}</p>
                          </div>
                        )}

                        {/* Botões */}
                        <div className="flex gap-2">
                          {r.etapa !== "CONCLUIDA" && (
                            <button
                              onClick={() => handleAvancar(r)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-400/10 text-orange-400 text-sm font-semibold rounded-lg border border-orange-400/30 hover:bg-orange-400/20 transition"
                            >
                              <ChevronRight className="w-4 h-4" />
                              Avançar para {getEtapaLabel(getProximaEtapa(r.etapa as EtapaPosVenda) ?? "")}
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(r)}
                            className="flex items-center gap-2 px-4 py-2.5 text-gray-300 bg-[#232a3b] rounded-lg hover:bg-[#2a3040] transition text-sm font-semibold"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edição inline */}
                    {isEditing && (
                      <div className="bg-[#1a1f2e] border border-orange-400/30 rounded-xl p-5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nome</label>
                            <input
                              value={editForm.nomeCliente}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, nomeCliente: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                            <input
                              value={editForm.telefone}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, telefone: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Etapa</label>
                            <select
                              value={editForm.etapa}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, etapa: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            >
                              {ETAPAS_POS_VENDA.map((et) => (
                                <option key={et.key} value={et.key}>
                                  {et.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Última Ação</label>
                            <input
                              value={editForm.ultimaAcao}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, ultimaAcao: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Próxima Ação</label>
                            <input
                              value={editForm.proximaAcao}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, proximaAcao: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Observações</label>
                            <input
                              value={editForm.observacoes}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, observacoes: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Último Contato
                            </label>
                            <input
                              type="date"
                              value={editForm.ultimoContato}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, ultimoContato: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Próximo Contato
                            </label>
                            <input
                              type="date"
                              value={editForm.proximoContato}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, proximoContato: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(r.id)}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-orange-300 disabled:opacity-50 transition"
                          >
                            <Check className="w-4 h-4" />
                            {saving ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#232a3b] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#2a3040] transition"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
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
      </main>
    </div>
  );
}

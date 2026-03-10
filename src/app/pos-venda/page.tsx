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
  RefreshCw,
  Trash2,
  Paperclip,
  Upload,
  FileText,
  Clock,
  ListTodo,
  PlusCircle,
  MessageSquare,
  Save,
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
  createdAt: string;
  operador: { id: string; nome: string };
  anexos: string | null;
  historicoAcoes: string | null;
  tarefas: string | null;
  anotacoes: string | null;
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
  const [erroMsg, setErroMsg] = useState("");
  const [filterEtapa, setFilterEtapa] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "semana" | "mes">("todos");
  const [trocandoEtapaId, setTrocandoEtapaId] = useState<string | null>(null);
  const [novaEtapaSel, setNovaEtapaSel] = useState("");
  const [uploadingAnexoId, setUploadingAnexoId] = useState<string | null>(null);
  // Tarefas
  const [novaTarefaTexto, setNovaTarefaTexto] = useState<Record<string, string>>({});
  const [filtroTarefa, setFiltroTarefa] = useState<Record<string, string>>({});
  const [salvandoTarefa, setSalvandoTarefa] = useState<string | null>(null);
  // Anotações
  const [anotacoesEdit, setAnotacoesEdit] = useState<Record<string, string>>({});
  const [salvandoAnotacao, setSalvandoAnotacao] = useState<string | null>(null);

  const hoje = new Date().toISOString().split("T")[0];

  // Helpers para filtro de data
  const getInicioSemana = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // segunda
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
  };
  const getFimSemana = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // domingo
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
    setErroMsg("");
    try {
      const res = await fetch(`/api/pos-venda/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || `Erro ${res.status} ao salvar`);
        return;
      }
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

  function iniciarTrocaEtapa(r: PosVendaRegistro) {
    setTrocandoEtapaId(r.id);
    setNovaEtapaSel(r.etapa);
  }

  async function salvarTrocaEtapa(id: string) {
    setSaving(true);
    setErroMsg("");
    try {
      const res = await fetch(`/api/pos-venda/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: novaEtapaSel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || `Erro ${res.status} ao alterar etapa`);
        return;
      }
      setTrocandoEtapaId(null);
      await fetchRegistros();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemover(id: string) {
    if (!confirm("Remover este cliente do pós-venda?")) return;
    setErroMsg("");
    try {
      const res = await fetch(`/api/pos-venda/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || `Erro ao remover`);
        return;
      }
      await fetchRegistros();
    } catch {
      setErroMsg("Erro ao remover");
    }
  }

  async function handleAnexoUpload(r: PosVendaRegistro, file: File) {
    if (file.size > 15 * 1024 * 1024) {
      setErroMsg("Arquivo excede o limite de 15MB");
      return;
    }
    setUploadingAnexoId(r.id);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const existingAnexos: { nome: string; url: string; data: string }[] = r.anexos
        ? JSON.parse(r.anexos)
        : [];
      existingAnexos.push({
        nome: file.name,
        url: base64,
        data: new Date().toISOString().split("T")[0],
      });
      const res = await fetch(`/api/pos-venda/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anexos: JSON.stringify(existingAnexos) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao enviar anexo");
        return;
      }
      await fetchRegistros();
    } catch {
      setErroMsg("Erro ao processar arquivo");
    } finally {
      setUploadingAnexoId(null);
    }
  }

  // ======= TAREFAS =======
  type Tarefa = { id: string; descricao: string; status: string; criadoEm: string };

  function getTarefas(r: PosVendaRegistro): Tarefa[] {
    if (!r.tarefas) return [];
    try { return JSON.parse(r.tarefas); } catch { return []; }
  }

  async function adicionarTarefa(r: PosVendaRegistro) {
    const texto = (novaTarefaTexto[r.id] || "").trim();
    if (!texto) return;
    setSalvandoTarefa(r.id);
    const tarefasAtuais = getTarefas(r);
    tarefasAtuais.push({
      id: Date.now().toString(),
      descricao: texto,
      status: "PENDENTE",
      criadoEm: hoje,
    });
    try {
      await fetch(`/api/pos-venda/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarefas: JSON.stringify(tarefasAtuais) }),
      });
      setNovaTarefaTexto((p) => ({ ...p, [r.id]: "" }));
      await fetchRegistros();
    } finally {
      setSalvandoTarefa(null);
    }
  }

  async function alterarStatusTarefa(r: PosVendaRegistro, tarefaId: string, novoStatus: string) {
    setSalvandoTarefa(r.id);
    const tarefasAtuais = getTarefas(r).map((t) =>
      t.id === tarefaId ? { ...t, status: novoStatus } : t
    );
    try {
      await fetch(`/api/pos-venda/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarefas: JSON.stringify(tarefasAtuais) }),
      });
      await fetchRegistros();
    } finally {
      setSalvandoTarefa(null);
    }
  }

  async function removerTarefa(r: PosVendaRegistro, tarefaId: string) {
    setSalvandoTarefa(r.id);
    const tarefasAtuais = getTarefas(r).filter((t) => t.id !== tarefaId);
    try {
      await fetch(`/api/pos-venda/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarefas: JSON.stringify(tarefasAtuais) }),
      });
      await fetchRegistros();
    } finally {
      setSalvandoTarefa(null);
    }
  }

  async function salvarAnotacoes(r: PosVendaRegistro) {
    setSalvandoAnotacao(r.id);
    try {
      await fetch(`/api/pos-venda/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anotacoes: anotacoesEdit[r.id] ?? r.anotacoes ?? "" }),
      });
      await fetchRegistros();
    } finally {
      setSalvandoAnotacao(null);
    }
  }

  const STATUS_CORES: Record<string, { bg: string; text: string; label: string }> = {
    PENDENTE: { bg: "bg-amber-400/15", text: "text-amber-400", label: "#pendente" },
    FAZENDO: { bg: "bg-sky-400/15", text: "text-sky-400", label: "#fazendo" },
    FINALIZADO: { bg: "bg-emerald-400/15", text: "text-emerald-400", label: "#finalizado" },
  };

  // Filtrar registros: primeiro por período, depois por etapa
  let clientesFiltrados = registros;
  if (filtroPeriodo === "semana") {
    const inicio = getInicioSemana();
    const fim = getFimSemana();
    clientesFiltrados = clientesFiltrados.filter((r) => {
      const d = r.createdAt?.split("T")[0];
      return d && d >= inicio && d <= fim;
    });
  } else if (filtroPeriodo === "mes") {
    const inicio = getInicioMes();
    const fim = getFimMes();
    clientesFiltrados = clientesFiltrados.filter((r) => {
      const d = r.createdAt?.split("T")[0];
      return d && d >= inicio && d <= fim;
    });
  }
  if (filterEtapa) {
    clientesFiltrados = clientesFiltrados.filter((r) => r.etapa === filterEtapa);
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

          {/* Erro global */}
          {erroMsg && (
            <div className="mb-4 flex items-center gap-3 bg-red-400/10 border border-red-400/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{erroMsg}</p>
              <button onClick={() => setErroMsg("")} className="ml-auto text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

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

          {/* Filtros de periodo */}
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
              Todos ({clientesFiltrados.length})
            </button>
            {ETAPAS_POS_VENDA.map((et) => {
              const count = registros.filter((r) => r.etapa === et.key).length;
              const cores = ETAPA_CORES[et.key];
              return (
                <button
                  key={et.key}
                  onClick={() => setFilterEtapa(et.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterEtapa === et.key
                      ? `${cores.bg} ${cores.text}`
                      : count > 0
                        ? "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
                        : "bg-[#141820] text-gray-600 cursor-pointer hover:bg-[#1a1f2e]"
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

                        {/* Tarefas */}
                        {(() => {
                          const tarefas = getTarefas(r);
                          const filtroAtual = filtroTarefa[r.id] || "TODOS";
                          const tarefasFiltradas = filtroAtual === "TODOS"
                            ? tarefas
                            : tarefas.filter((t) => t.status === filtroAtual);
                          const countPendente = tarefas.filter((t) => t.status === "PENDENTE").length;
                          const countFazendo = tarefas.filter((t) => t.status === "FAZENDO").length;
                          const countFinalizado = tarefas.filter((t) => t.status === "FINALIZADO").length;

                          return (
                            <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                              <p className="text-xs text-gray-500 font-semibold uppercase mb-3 flex items-center gap-1.5">
                                <ListTodo className="w-3.5 h-3.5" />
                                Tarefas
                              </p>

                              {/* Filtros de status */}
                              <div className="flex gap-1.5 mb-3 flex-wrap">
                                <button
                                  onClick={() => setFiltroTarefa((p) => ({ ...p, [r.id]: "TODOS" }))}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    filtroAtual === "TODOS"
                                      ? "bg-orange-400/20 text-orange-400"
                                      : "bg-[#232a3b] text-gray-400 hover:bg-[#2a3040]"
                                  }`}
                                >
                                  Todos ({tarefas.length})
                                </button>
                                <button
                                  onClick={() => setFiltroTarefa((p) => ({ ...p, [r.id]: "PENDENTE" }))}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    filtroAtual === "PENDENTE"
                                      ? "bg-amber-400/20 text-amber-400"
                                      : "bg-[#232a3b] text-gray-400 hover:bg-[#2a3040]"
                                  }`}
                                >
                                  #pendente ({countPendente})
                                </button>
                                <button
                                  onClick={() => setFiltroTarefa((p) => ({ ...p, [r.id]: "FAZENDO" }))}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    filtroAtual === "FAZENDO"
                                      ? "bg-sky-400/20 text-sky-400"
                                      : "bg-[#232a3b] text-gray-400 hover:bg-[#2a3040]"
                                  }`}
                                >
                                  #fazendo ({countFazendo})
                                </button>
                                <button
                                  onClick={() => setFiltroTarefa((p) => ({ ...p, [r.id]: "FINALIZADO" }))}
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    filtroAtual === "FINALIZADO"
                                      ? "bg-emerald-400/20 text-emerald-400"
                                      : "bg-[#232a3b] text-gray-400 hover:bg-[#2a3040]"
                                  }`}
                                >
                                  #finalizado ({countFinalizado})
                                </button>
                              </div>

                              {/* Lista de tarefas */}
                              {tarefasFiltradas.length > 0 ? (
                                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                                  {tarefasFiltradas.map((t) => {
                                    const cor = STATUS_CORES[t.status] || STATUS_CORES.PENDENTE;
                                    return (
                                      <div
                                        key={t.id}
                                        className="flex items-center gap-2 bg-[#0b0f19] rounded-lg px-3 py-2 border border-[#232a3b]"
                                      >
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cor.bg} ${cor.text} shrink-0`}>
                                          {cor.label}
                                        </span>
                                        <span className={`text-sm flex-1 ${t.status === "FINALIZADO" ? "text-gray-500 line-through" : "text-gray-300"}`}>
                                          {t.descricao}
                                        </span>
                                        <select
                                          value={t.status}
                                          onChange={(e) => alterarStatusTarefa(r, t.id, e.target.value)}
                                          disabled={salvandoTarefa === r.id}
                                          className="bg-[#141820] border border-[#232a3b] rounded-md px-1.5 py-1 text-xs text-gray-300 outline-none cursor-pointer"
                                        >
                                          <option value="PENDENTE">Pendente</option>
                                          <option value="FAZENDO">Fazendo</option>
                                          <option value="FINALIZADO">Finalizado</option>
                                        </select>
                                        <button
                                          onClick={() => removerTarefa(r, t.id)}
                                          disabled={salvandoTarefa === r.id}
                                          className="text-gray-600 hover:text-red-400 transition"
                                          title="Remover tarefa"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-600 mb-3">
                                  {tarefas.length === 0 ? "Nenhuma tarefa criada" : "Nenhuma tarefa neste filtro"}
                                </p>
                              )}

                              {/* Adicionar nova tarefa */}
                              <div className="flex gap-2">
                                <input
                                  value={novaTarefaTexto[r.id] || ""}
                                  onChange={(e) => setNovaTarefaTexto((p) => ({ ...p, [r.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") adicionarTarefa(r); }}
                                  placeholder="Nova tarefa..."
                                  className="flex-1 bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-orange-400 outline-none"
                                />
                                <button
                                  onClick={() => adicionarTarefa(r)}
                                  disabled={salvandoTarefa === r.id || !(novaTarefaTexto[r.id] || "").trim()}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-400/10 text-orange-400 border border-orange-400/30 rounded-lg text-xs font-semibold hover:bg-orange-400/20 disabled:opacity-40 transition"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Adicionar
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Anotações */}
                        <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Anotações
                          </p>
                          <textarea
                            value={anotacoesEdit[r.id] !== undefined ? anotacoesEdit[r.id] : (r.anotacoes || "")}
                            onChange={(e) => setAnotacoesEdit((p) => ({ ...p, [r.id]: e.target.value }))}
                            placeholder="Anotações pertinentes sobre este cliente..."
                            rows={3}
                            className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none resize-none"
                          />
                          {(anotacoesEdit[r.id] !== undefined && anotacoesEdit[r.id] !== (r.anotacoes || "")) && (
                            <button
                              onClick={() => salvarAnotacoes(r)}
                              disabled={salvandoAnotacao === r.id}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-400 text-gray-900 rounded-lg text-xs font-semibold hover:bg-orange-300 disabled:opacity-50 transition"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {salvandoAnotacao === r.id ? "Salvando..." : "Salvar Anotações"}
                            </button>
                          )}
                        </div>

                        {/* Anexos */}
                        <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-2 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            Anexos
                          </p>
                          {/* Lista de anexos existentes */}
                          {(() => {
                            const anexos: { nome: string; url: string; data: string }[] = r.anexos
                              ? JSON.parse(r.anexos)
                              : [];
                            return anexos.length > 0 ? (
                              <div className="space-y-1.5 mb-3">
                                {anexos.map((a, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                    <a
                                      href={a.url}
                                      download={a.nome}
                                      className="text-orange-400 hover:text-orange-300 underline underline-offset-2 truncate"
                                      title={a.nome}
                                    >
                                      {a.nome}
                                    </a>
                                    <span className="text-gray-500 text-xs shrink-0">
                                      {formatDate(a.data)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 mb-3">Nenhum anexo</p>
                            );
                          })()}
                          {/* Upload button */}
                          <input
                            type="file"
                            id={`anexo-upload-${r.id}`}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAnexoUpload(r, file);
                              e.target.value = "";
                            }}
                          />
                          <label
                            htmlFor={`anexo-upload-${r.id}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                              uploadingAnexoId === r.id
                                ? "bg-orange-400/20 text-orange-300 cursor-wait"
                                : "bg-orange-400/10 text-orange-400 border border-orange-400/30 hover:bg-orange-400/20"
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingAnexoId === r.id ? "Enviando..." : "Anexar Arquivo"}
                          </label>
                        </div>

                        {/* Botões */}
                        <div className="flex flex-wrap gap-2">
                          {r.etapa !== "CONCLUIDA" && trocandoEtapaId !== r.id && (
                            <button
                              onClick={() => handleAvancar(r)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-400/10 text-orange-400 text-sm font-semibold rounded-lg border border-orange-400/30 hover:bg-orange-400/20 transition"
                            >
                              <ChevronRight className="w-4 h-4" />
                              Avançar para {getEtapaLabel(getProximaEtapa(r.etapa as EtapaPosVenda) ?? "")}
                            </button>
                          )}

                          {/* Troca rápida de etapa */}
                          {trocandoEtapaId === r.id ? (
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                              <select
                                value={novaEtapaSel}
                                onChange={(e) => setNovaEtapaSel(e.target.value)}
                                className="flex-1 bg-[#0b0f19] border border-orange-400/50 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                              >
                                {ETAPAS_POS_VENDA.map((et) => (
                                  <option key={et.key} value={et.key}>{et.label}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => salvarTrocaEtapa(r.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-2 bg-orange-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-orange-300 disabled:opacity-50 transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {saving ? "..." : "Salvar"}
                              </button>
                              <button
                                onClick={() => setTrocandoEtapaId(null)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-[#232a3b] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#2a3040] transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => iniciarTrocaEtapa(r)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sky-400 bg-sky-400/10 rounded-lg hover:bg-sky-400/20 border border-sky-400/30 transition text-sm font-semibold"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Alterar Etapa
                            </button>
                          )}

                          {trocandoEtapaId !== r.id && (
                            <button
                              onClick={() => startEdit(r)}
                              className="flex items-center gap-2 px-4 py-2.5 text-gray-300 bg-[#232a3b] rounded-lg hover:bg-[#2a3040] transition text-sm font-semibold"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </button>
                          )}

                          {trocandoEtapaId !== r.id && (
                            <button
                              onClick={() => handleRemover(r.id)}
                              className="flex items-center gap-2 px-4 py-2.5 text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 border border-red-400/20 transition text-sm font-semibold"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remover
                            </button>
                          )}
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

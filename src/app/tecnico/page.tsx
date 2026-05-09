"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Wrench,
  Plus,
  ChevronRight,
  ChevronDown,
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
  Download,
  FileText,
  User,
  Clock,
  Zap,
  MessageSquare,
  Send,
  Eye,
  Upload,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { canAccessTecnico } from "@/lib/roles";
import {
  ETAPAS_SETOR_TECNICO,
  getEtapaTecnicoLabel,
  getProximaEtapaTecnico,
  ETAPA_TECNICO_CORES,
  type EtapaSetorTecnico,
} from "@/lib/setor-tecnico";
import { formatCurrency } from "@/lib/utils";

type Anexo = {
  nome: string;
  url: string;
  data: string;
};

type HistoricoAcao = {
  data: string;
  acao: string;
};

type Comentario = {
  id: string;
  autor: string;
  texto: string;
  criadoEm: string;
};

type RegistroTecnico = {
  id: string;
  nomeCliente: string;
  telefone: string | null;
  email: string | null;
  vendedorNome: string | null;
  etapa: string;
  observacoes: string | null;
  ultimaAcao: string | null;
  proximaAcao: string | null;
  // Campos pesados — preenchidos sob demanda quando o card expande
  historicoAcoes?: string | null;
  anexos?: string | null;
  comentarios?: string | null;
  venda: {
    id: string;
    cliente: string;
    valorVenda: number;
    kwp: number;
    quantidadePlacas: number;
  } | null;
  createdAt: string;
  // Counts vindos da listagem enxuta
  anexosCount?: number;
  comentariosCount?: number;
  // Marca se o registro ja teve detalhes carregados
  _detalhesCarregados?: boolean;
};

type FormData = {
  nomeCliente: string;
  telefone: string;
  email: string;
  etapa: string;
  observacoes: string;
};

type EditFormData = {
  nomeCliente: string;
  telefone: string;
  email: string;
  etapa: string;
  observacoes: string;
  ultimaAcao: string;
  proximaAcao: string;
};

const FORM_INICIAL: FormData = {
  nomeCliente: "",
  telefone: "",
  email: "",
  etapa: "NOVO_PROJETO",
  observacoes: "",
};

const EDIT_FORM_INICIAL: EditFormData = {
  nomeCliente: "",
  telefone: "",
  email: "",
  etapa: "NOVO_PROJETO",
  observacoes: "",
  ultimaAcao: "",
  proximaAcao: "",
};

function formatDate(d: string | null) {
  if (!d) return "\u2014";
  if (d.includes("T")) {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function parseAnexos(raw: string | null | undefined): Anexo[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseHistorico(raw: string | null | undefined): HistoricoAcao[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseComentarios(raw: string | null | undefined): Comentario[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SetorTecnicoPage() {
  const { data: session, status } = useSession();
  const [registros, setRegistros] = useState<RegistroTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>(EDIT_FORM_INICIAL);
  const [saving, setSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState("");
  const [filterEtapa, setFilterEtapa] = useState<string | null>(null);
  const [trocandoEtapaId, setTrocandoEtapaId] = useState<string | null>(null);
  const [novaEtapaSel, setNovaEtapaSel] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [novoComentario, setNovoComentario] = useState<Record<string, string>>({});
  const [salvandoComentario, setSalvandoComentario] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setor-tecnico");
      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  // Carrega campos pesados (anexos, comentarios, historicoAcoes) sob demanda
  // ao expandir um card. Evita refetch se ja carregou.
  const loadDetalhes = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/setor-tecnico/${id}`);
      if (!res.ok) return;
      const full = await res.json();
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...full, _detalhesCarregados: true } : r,
        ),
      );
    } catch {
      // silencioso
    }
  }, []);

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const target = registros.find((r) => r.id === id);
    if (!target?._detalhesCarregados) {
      loadDetalhes(id);
    }
  }

  // Access control
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

  if (!canAccessTecnico(session?.user?.role)) {
    return (
      <div className="flex min-h-screen bg-[#0b0f19]">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6">
          <div className="text-center text-red-400 py-12">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            Acesso negado. Voce nao tem permissao para acessar o Setor Tecnico.
          </div>
        </main>
      </div>
    );
  }

  async function handleCreate() {
    if (!form.nomeCliente.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/setor-tecnico", {
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

  function startEdit(r: RegistroTecnico) {
    setEditingId(r.id);
    setEditForm({
      nomeCliente: r.nomeCliente,
      telefone: r.telefone ?? "",
      email: r.email ?? "",
      etapa: r.etapa,
      observacoes: r.observacoes ?? "",
      ultimaAcao: r.ultimaAcao ?? "",
      proximaAcao: r.proximaAcao ?? "",
    });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    setErroMsg("");
    try {
      const res = await fetch(`/api/setor-tecnico/${id}`, {
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

  async function handleAvancar(r: RegistroTecnico) {
    const proxima = getProximaEtapaTecnico(r.etapa);
    if (!proxima) return;
    await fetch(`/api/setor-tecnico/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: proxima }),
    });
    await fetchRegistros();
  }

  function iniciarTrocaEtapa(r: RegistroTecnico) {
    setTrocandoEtapaId(r.id);
    setNovaEtapaSel(r.etapa);
  }

  async function salvarTrocaEtapa(id: string) {
    setSaving(true);
    setErroMsg("");
    try {
      const res = await fetch(`/api/setor-tecnico/${id}`, {
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
    if (!confirm("Remover este projeto do Setor Tecnico?")) return;
    setErroMsg("");
    try {
      const res = await fetch(`/api/setor-tecnico/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao remover");
        return;
      }
      await fetchRegistros();
    } catch {
      setErroMsg("Erro ao remover");
    }
  }

  async function handleFileUpload(r: RegistroTecnico, file: File) {
    if (file.size > 15 * 1024 * 1024) {
      setErroMsg("Arquivo muito grande. Maximo 15MB.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      setErroMsg("Tipo de arquivo nao permitido. Envie PDF ou imagem.");
      return;
    }

    setUploadingId(r.id);
    setErroMsg("");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Server-side append: mesmo motivo dos comentarios.
      const res = await fetch(`/api/setor-tecnico/${r.id}/anexos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: file.name, url: base64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao enviar anexo");
        return;
      }

      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch {
      setErroMsg("Erro ao processar arquivo");
    } finally {
      setUploadingId(null);
      // Reset file input
      const input = fileInputRefs.current[r.id];
      if (input) input.value = "";
    }
  }

  async function handleAdicionarComentario(r: RegistroTecnico) {
    const texto = novoComentario[r.id]?.trim();
    if (!texto) return;
    setSalvandoComentario(r.id);
    try {
      // Server-side append: o servidor le o estado atual do banco e da push.
      // Elimina o bug de wipeout quando dois usuarios editam ao mesmo tempo
      // ou quando o cliente ainda nao carregou os comentarios via loadDetalhes.
      const res = await fetch(`/api/setor-tecnico/${r.id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao salvar comentario");
        return;
      }
      setNovoComentario((p) => ({ ...p, [r.id]: "" }));
      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch {
      setErroMsg("Erro ao salvar comentario");
    } finally {
      setSalvandoComentario(null);
    }
  }

  async function handleRemoveAnexo(r: RegistroTecnico, idx: number) {
    if (!confirm("Excluir este anexo?")) return;
    try {
      // Identifica o anexo por nome+data (server-side delete sem race)
      const atual = parseAnexos(r.anexos)[idx];
      if (!atual) {
        setErroMsg("Anexo nao encontrado no estado local");
        return;
      }
      const res = await fetch(`/api/setor-tecnico/${r.id}/anexos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: atual.nome, data: atual.data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao excluir anexo");
        return;
      }
      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch {
      setErroMsg("Erro ao excluir anexo");
    }
  }

  // Filter registros by etapa
  let clientesFiltrados = registros;
  if (filterEtapa) {
    clientesFiltrados = clientesFiltrados.filter((r) => r.etapa === filterEtapa);
  }

  // Sort by creation date (most recent first)
  clientesFiltrados = [...clientesFiltrados].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
                <Wrench className="w-6 h-6 text-teal-400" />
                Setor Tecnico
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {clientesFiltrados.length} projetos
                {filterEtapa && ` em "${getEtapaTecnicoLabel(filterEtapa)}"`}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-400 text-gray-900 rounded-xl font-semibold text-sm hover:bg-teal-300 transition"
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
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

          {/* Formulario novo projeto */}
          {showForm && (
            <div className="bg-[#1a1f2e] border border-teal-400/30 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-4">
                Novo Projeto
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Cliente *</label>
                  <input
                    value={form.nomeCliente}
                    onChange={(e) => setForm((p) => ({ ...p, nomeCliente: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                    placeholder="(84) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                    placeholder="cliente@email.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Etapa Inicial</label>
                  <select
                    value={form.etapa}
                    onChange={(e) => setForm((p) => ({ ...p, etapa: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                  >
                    {ETAPAS_SETOR_TECNICO.map((et) => (
                      <option key={et.key} value={et.key}>{et.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs text-gray-500 mb-1">Observacoes</label>
                  <input
                    value={form.observacoes}
                    onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                    className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                    placeholder="Notas adicionais"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.nomeCliente.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-teal-300 disabled:opacity-50 transition"
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
                  ? "bg-teal-400 text-gray-900"
                  : "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Todos ({registros.length})
            </button>
            {ETAPAS_SETOR_TECNICO.map((et) => {
              const count = registros.filter((r) => r.etapa === et.key).length;
              const cores = ETAPA_TECNICO_CORES[et.key];
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
            <div className="text-center text-gray-500 py-12">Carregando projetos...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-[#1a1f2e] rounded-xl border border-[#232a3b]">
              Nenhum projeto encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {clientesFiltrados.map((r) => {
                const isEditing = editingId === r.id;
                const cores = ETAPA_TECNICO_CORES[r.etapa] ?? { bg: "bg-gray-400/10", text: "text-gray-400", border: "border-gray-400/30" };
                const anexos = parseAnexos(r.anexos);
                const historico = parseHistorico(r.historicoAcoes);
                const comentarios = parseComentarios(r.comentarios);
                const proximaEtapa = getProximaEtapaTecnico(r.etapa);
                const isExpanded = expandedId === r.id;
                // Counts pra exibicao no header colapsado: prefere o que vem da listagem enxuta
                const anexosCount = r.anexosCount ?? anexos.length;
                const comentariosCount = r.comentariosCount ?? comentarios.length;

                return (
                  <div key={r.id}>
                    {/* Card de visualizacao */}
                    {!isEditing && (
                      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl transition hover:border-[#2a3050]">
                        {/* === CABEÇALHO CLICÁVEL (sempre visível) === */}
                        <button
                          onClick={() => toggleExpand(r.id)}
                          className="w-full text-left p-5 flex items-center gap-4"
                        >
                          {/* Seta de expansão */}
                          <ChevronDown
                            className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${
                              isExpanded ? "rotate-0" : "-rotate-90"
                            }`}
                          />

                          {/* Info principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-gray-100 truncate">
                                {r.nomeCliente}
                              </h3>
                              {r.telefone && (
                                <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
                                  <Phone className="w-3.5 h-3.5" />
                                  {r.telefone}
                                </span>
                              )}
                            </div>
                            {/* Resumo compacto */}
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              {r.vendedorNome && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <User className="w-3 h-3" />
                                  {r.vendedorNome}
                                </span>
                              )}
                              {r.proximaAcao && (
                                <span className="truncate max-w-[200px]">
                                  <span className="text-gray-600">Próxima:</span>{" "}
                                  <span className="text-teal-300/80">{r.proximaAcao}</span>
                                </span>
                              )}
                              {anexosCount > 0 && (
                                <span className="flex items-center gap-1 text-gray-500 shrink-0">
                                  <Paperclip className="w-3 h-3" />
                                  {anexosCount}
                                </span>
                              )}
                              {comentariosCount > 0 && (
                                <span className="flex items-center gap-1 text-gray-500 shrink-0">
                                  <MessageSquare className="w-3 h-3" />
                                  {comentariosCount}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge Etapa */}
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${cores.bg} ${cores.text}`}
                          >
                            {getEtapaTecnicoLabel(r.etapa)}
                          </span>
                        </button>

                        {/* === CONTEÚDO EXPANDIDO === */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-[#232a3b]">
                        {/* Dados da venda vinculada */}
                        {r.venda && (
                          <div className="mt-4 mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
                              Dados da Venda
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-gray-500">Valor</p>
                                <p className="text-sm text-teal-400 font-semibold">
                                  {formatCurrency(r.venda.valorVenda)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">kWp</p>
                                <p className="text-sm text-gray-300 font-semibold">
                                  {r.venda.kwp}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Placas</p>
                                <p className="text-sm text-gray-300 font-semibold">
                                  {r.venda.quantidadePlacas}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Cliente</p>
                                <p className="text-sm text-gray-300 font-semibold truncate">
                                  {r.venda.cliente}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Conteudo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            {r.ultimaAcao && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                  Ultima Acao
                                </p>
                                <p className="text-sm text-gray-300">{r.ultimaAcao}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                Criado em
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                {formatDate(r.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {r.proximaAcao && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                                  Proxima Acao
                                </p>
                                <p className="text-sm text-teal-300 font-medium">{r.proximaAcao}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Historico de acoes */}
                        {historico.length > 0 && (
                          <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Historico de Acoes
                            </p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {historico.map((h, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <span className="text-gray-500 text-xs whitespace-nowrap mt-0.5">
                                    {formatDate(h.data)}
                                  </span>
                                  <span className="text-gray-300">{h.acao}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Observacoes */}
                        {r.observacoes && (
                          <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                              Observacoes
                            </p>
                            <p className="text-sm text-gray-300">{r.observacoes}</p>
                          </div>
                        )}

                        {/* Anexos */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500 font-semibold uppercase flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5" />
                              Anexos ({anexos.length})
                            </p>
                            <div>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                                ref={(el) => { fileInputRefs.current[r.id] = el; }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(r, file);
                                }}
                                className="hidden"
                                id={`file-input-${r.id}`}
                              />
                              <label
                                htmlFor={`file-input-${r.id}`}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                                  uploadingId === r.id
                                    ? "bg-teal-400/10 text-teal-400 opacity-50 cursor-wait"
                                    : "bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 border border-teal-400/30"
                                }`}
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                {uploadingId === r.id ? "Enviando..." : "Anexar"}
                              </label>
                            </div>
                          </div>
                          {anexos.length > 0 && (
                            <div className="space-y-1.5">
                              {anexos.map((a, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 p-2 bg-[#141820] rounded-lg border border-[#232a3b]"
                                >
                                  <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                                  <span className="text-sm text-gray-300 truncate flex-1">
                                    {a.nome}
                                  </span>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDate(a.data)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const w = window.open("", "_blank");
                                      if (w) {
                                        if (a.url.startsWith("data:application/pdf") || a.nome.toLowerCase().endsWith(".pdf")) {
                                          w.document.write(`<iframe src="${a.url}" style="width:100%;height:100%;border:none;position:fixed;top:0;left:0;" />`);
                                        } else {
                                          w.document.write(`<img src="${a.url}" style="max-width:100%;height:auto;margin:auto;display:block;" />`);
                                        }
                                        w.document.title = a.nome;
                                      }
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-sky-400 hover:bg-sky-400/10 border border-sky-400/30 transition shrink-0"
                                    title="Visualizar"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={a.url}
                                    download={a.nome}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-teal-400 hover:bg-teal-400/10 border border-teal-400/30 transition shrink-0"
                                    title="Baixar"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handleRemoveAnexo(r, i)}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-400/10 border border-red-400/30 transition shrink-0"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Comentarios */}
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Comentários ({comentarios.length})
                          </p>
                          {comentarios.length > 0 && (
                            <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                              {comentarios.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-3 bg-[#141820] rounded-lg border border-[#232a3b]"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-teal-400">
                                      {c.autor}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(c.criadoEm)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300">{c.texto}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              value={novoComentario[r.id] || ""}
                              onChange={(e) =>
                                setNovoComentario((p) => ({ ...p, [r.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAdicionarComentario(r);
                                }
                              }}
                              className="flex-1 bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                              placeholder="Escreva um comentário..."
                            />
                            <button
                              onClick={() => handleAdicionarComentario(r)}
                              disabled={salvandoComentario === r.id || !novoComentario[r.id]?.trim()}
                              className="flex items-center gap-1.5 px-3 py-2 bg-teal-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-teal-300 disabled:opacity-50 transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {salvandoComentario === r.id ? "..." : "Enviar"}
                            </button>
                          </div>
                        </div>

                        {/* Botoes */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {proximaEtapa && trocandoEtapaId !== r.id && (
                            <button
                              onClick={() => handleAvancar(r)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-400/10 text-teal-400 text-sm font-semibold rounded-lg border border-teal-400/30 hover:bg-teal-400/20 transition"
                            >
                              <ChevronRight className="w-4 h-4" />
                              Avancar para {getEtapaTecnicoLabel(proximaEtapa)}
                            </button>
                          )}

                          {/* Troca rapida de etapa */}
                          {trocandoEtapaId === r.id ? (
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                              <select
                                value={novaEtapaSel}
                                onChange={(e) => setNovaEtapaSel(e.target.value)}
                                className="flex-1 bg-[#0b0f19] border border-teal-400/50 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                              >
                                {ETAPAS_SETOR_TECNICO.map((et) => (
                                  <option key={et.key} value={et.key}>{et.label}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => salvarTrocaEtapa(r.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-2 bg-teal-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-teal-300 disabled:opacity-50 transition"
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
                      </div>
                    )}

                    {/* Edicao inline */}
                    {isEditing && (
                      <div className="bg-[#1a1f2e] border border-teal-400/30 rounded-xl p-5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nome</label>
                            <input
                              value={editForm.nomeCliente}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, nomeCliente: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                            <input
                              value={editForm.telefone}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, telefone: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                            <input
                              value={editForm.email}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, email: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                              placeholder="cliente@email.com"
                              type="email"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Etapa</label>
                            <select
                              value={editForm.etapa}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, etapa: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                            >
                              {ETAPAS_SETOR_TECNICO.map((et) => (
                                <option key={et.key} value={et.key}>
                                  {et.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ultima Acao</label>
                            <input
                              value={editForm.ultimaAcao}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, ultimaAcao: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                              placeholder="Ex: Enviado projeto para analise"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Proxima Acao</label>
                            <input
                              value={editForm.proximaAcao}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, proximaAcao: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                              placeholder="Ex: Aguardar aprovacao COSERN"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Observacoes</label>
                            <input
                              value={editForm.observacoes}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, observacoes: e.target.value }))
                              }
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-400 outline-none"
                              placeholder="Notas adicionais"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(r.id)}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-400 text-gray-900 rounded-lg text-sm font-medium hover:bg-teal-300 disabled:opacity-50 transition"
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

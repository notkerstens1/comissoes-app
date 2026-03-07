"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Wrench,
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
  Download,
  FileText,
  User,
  Clock,
  Zap,
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

type RegistroTecnico = {
  id: string;
  nomeCliente: string;
  telefone: string | null;
  vendedorNome: string | null;
  etapa: string;
  observacoes: string | null;
  ultimaAcao: string | null;
  proximaAcao: string | null;
  historicoAcoes: string | null;
  anexos: string | null;
  venda: {
    id: string;
    cliente: string;
    valorVenda: number;
    kwp: number;
    quantidadePlacas: number;
  } | null;
  createdAt: string;
};

type FormData = {
  nomeCliente: string;
  telefone: string;
  etapa: string;
  observacoes: string;
};

type EditFormData = {
  nomeCliente: string;
  telefone: string;
  etapa: string;
  observacoes: string;
  ultimaAcao: string;
  proximaAcao: string;
};

const FORM_INICIAL: FormData = {
  nomeCliente: "",
  telefone: "",
  etapa: "NOVO_PROJETO",
  observacoes: "",
};

const EDIT_FORM_INICIAL: EditFormData = {
  nomeCliente: "",
  telefone: "",
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

function parseAnexos(raw: string | null): Anexo[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseHistorico(raw: string | null): HistoricoAcao[] {
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

      const anexosAtuais = parseAnexos(r.anexos);
      const novoAnexo: Anexo = {
        nome: file.name,
        url: base64,
        data: new Date().toISOString(),
      };
      const anexosAtualizados = [...anexosAtuais, novoAnexo];

      const res = await fetch(`/api/setor-tecnico/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anexos: JSON.stringify(anexosAtualizados) }),
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
      setUploadingId(null);
      // Reset file input
      const input = fileInputRefs.current[r.id];
      if (input) input.value = "";
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
                const proximaEtapa = getProximaEtapaTecnico(r.etapa);

                return (
                  <div key={r.id}>
                    {/* Card de visualizacao */}
                    {!isEditing && (
                      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5 transition hover:border-[#2a3050]">
                        {/* Cabecalho: Nome + Etapa */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-100">
                              {r.nomeCliente}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {r.telefone && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                  <Phone className="w-3.5 h-3.5" />
                                  {r.telefone}
                                </div>
                              )}
                              {r.vendedorNome && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                  <User className="w-3.5 h-3.5" />
                                  {r.vendedorNome}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Badge Etapa */}
                          <div className="flex gap-2 flex-shrink-0">
                            <span
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cores.bg} ${cores.text}`}
                            >
                              {getEtapaTecnicoLabel(r.etapa)}
                            </span>
                          </div>
                        </div>

                        {/* Dados da venda vinculada */}
                        {r.venda && (
                          <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
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
                          {/* Coluna 1 */}
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

                          {/* Coluna 2 */}
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
                                  <a
                                    href={a.url}
                                    download={a.nome}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-teal-400 hover:bg-teal-400/10 transition"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Baixar
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Botoes */}
                        <div className="flex flex-wrap gap-2">
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

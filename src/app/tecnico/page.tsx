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
  MessageSquare,
  Send,
  Eye,
  Hammer,
  Search,
} from "lucide-react";
import { OperacaoNav } from "@/components/OperacaoNav";
import { canAccessTecnico, canEditVistoria, canEditInstalacao, canEditCustoMaterial } from "@/lib/roles";
import {
  ETAPAS_PROJETO,
  ETAPAS_INSTALACAO,
  getLabelProjeto,
  getLabelInstalacao,
  getProximaEtapaProjeto,
  getProximaEtapaInstalacao,
  ETAPA_TECNICO_CORES,
} from "@/lib/setor-tecnico";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EtiquetasChips, EtiquetasSelector } from "@/components/Etiquetas";
import { parseEtiquetas } from "@/lib/etiquetas";

type Anexo = { nome: string; url: string; data: string };
type HistoricoAcao = { data: string; acao: string };
type Comentario = { id: string; autor: string; texto: string; criadoEm: string };

type RegistroTecnico = {
  id: string;
  nomeCliente: string;
  codigoLocalizador?: string | null;
  telefone: string | null;
  email: string | null;
  vendedorNome: string | null;
  etapa: string;             // trilho PROJETO
  etapaInstalacao: string;   // trilho INSTALACAO
  dataVistoria?: string | null;
  dataInstalacao?: string | null;
  cidadeInstalacao?: string | null;
  enderecoInstalacao?: string | null;
  observacoes: string | null;
  ultimaAcao: string | null;
  proximaAcao: string | null;
  historicoAcoes?: string | null;
  anexos?: string | null;
  comentarios?: string | null;
  etiquetas?: string | null;
  custoMaterialReal?: number | null;
  statusMaterial?: string | null;
  venda: {
    id: string;
    cliente: string;
    valorVenda: number;
    kwp: number;
    quantidadePlacas: number;
  } | null;
  createdAt: string;
  anexosCount?: number;
  comentariosCount?: number;
  _detalhesCarregados?: boolean;
};

type FormData = {
  nomeCliente: string;
  telefone: string;
  email: string;
  etapa: string;
  etapaInstalacao: string;
  observacoes: string;
};

type EditFormData = {
  nomeCliente: string;
  telefone: string;
  email: string;
  etapa: string;
  etapaInstalacao: string;
  observacoes: string;
  ultimaAcao: string;
  proximaAcao: string;
};

type AbaAtiva = "PROJETOS" | "PROJETOS_CONCLUIDOS" | "INSTALACOES" | "CONCLUIDOS";

const FORM_INICIAL: FormData = {
  nomeCliente: "",
  telefone: "",
  email: "",
  etapa: "NOVO_PROJETO",
  etapaInstalacao: "AGENDAR_VISITA",
  observacoes: "",
};

const EDIT_FORM_INICIAL: EditFormData = {
  nomeCliente: "",
  telefone: "",
  email: "",
  etapa: "NOVO_PROJETO",
  etapaInstalacao: "AGENDAR_VISITA",
  observacoes: "",
  ultimaAcao: "",
  proximaAcao: "",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  if (d.includes("T")) {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function parseAnexos(raw: string | null | undefined): Anexo[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseHistorico(raw: string | null | undefined): HistoricoAcao[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseComentarios(raw: string | null | undefined): Comentario[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

// Cores da margem do material (VERDE/AMARELO/VERMELHO — escolhido a mao pelo Pedro)
const STATUS_MATERIAL_CORES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  VERDE:    { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40", dot: "bg-emerald-400" },
  AMARELO:  { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/40",   dot: "bg-amber-400"   },
  VERMELHO: { bg: "bg-red-500/20",     text: "text-red-300",     border: "border-red-500/60",     dot: "bg-red-400"     },
};

// Filtra registros pra cada aba.
// Regra (modelo dois trilhos):
//   PROJETOS              = etapa != PROJETO_APROVADO
//   PROJETOS_CONCLUIDOS   = etapa = PROJETO_APROVADO E etapaInstalacao != REDE_LIGADA
//   INSTALACOES           = etapaInstalacao != REDE_LIGADA
//   CONCLUIDOS            = etapaInstalacao = REDE_LIGADA
function filtrarPorAba(registros: RegistroTecnico[], aba: AbaAtiva): RegistroTecnico[] {
  switch (aba) {
    case "PROJETOS":
      return registros.filter((r) => r.etapa !== "PROJETO_APROVADO");
    case "PROJETOS_CONCLUIDOS":
      return registros.filter(
        (r) => r.etapa === "PROJETO_APROVADO" && r.etapaInstalacao !== "REDE_LIGADA",
      );
    case "INSTALACOES":
      return registros.filter((r) => r.etapaInstalacao !== "REDE_LIGADA");
    case "CONCLUIDOS":
      return registros.filter((r) => r.etapaInstalacao === "REDE_LIGADA");
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
  const [buscaNome, setBuscaNome] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("PROJETOS");
  const [trocandoEtapaId, setTrocandoEtapaId] = useState<string | null>(null);
  const [novaEtapaSel, setNovaEtapaSel] = useState("");
  const [novaEtapaTrilho, setNovaEtapaTrilho] = useState<"PROJETO" | "INSTALACAO">("PROJETO");
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

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const loadDetalhes = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/setor-tecnico/${id}`);
      if (!res.ok) return;
      const full = await res.json();
      setRegistros((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...full, _detalhesCarregados: true } : r)),
      );
    } catch { /* silencioso */ }
  }, []);

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const target = registros.find((r) => r.id === id);
    if (!target?._detalhesCarregados) loadDetalhes(id);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage" />
      </div>
    );
  }

  if (!canAccessTecnico(session?.user?.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-liv-danger py-12">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Acesso negado. Voce nao tem permissao para acessar o Setor Tecnico.
        </div>
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
    } finally { setSaving(false); }
  }

  function startEdit(r: RegistroTecnico) {
    setEditingId(r.id);
    setEditForm({
      nomeCliente: r.nomeCliente,
      telefone: r.telefone ?? "",
      email: r.email ?? "",
      etapa: r.etapa,
      etapaInstalacao: r.etapaInstalacao,
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
    } finally { setSaving(false); }
  }

  // Avanca trilho de PROJETO (uma posicao). Nao toca em etapaInstalacao.
  async function handleAvancarProjeto(r: RegistroTecnico) {
    const proxima = getProximaEtapaProjeto(r.etapa);
    if (!proxima) return;
    await fetch(`/api/setor-tecnico/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: proxima }),
    });
    await fetchRegistros();
  }

  // Avanca trilho de INSTALACAO (uma posicao). Nao toca em etapa.
  async function handleAvancarInstalacao(r: RegistroTecnico) {
    const proxima = getProximaEtapaInstalacao(r.etapaInstalacao);
    if (!proxima) return;
    await fetch(`/api/setor-tecnico/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaInstalacao: proxima }),
    });
    await fetchRegistros();
  }

  // Toggle de etiqueta manual (append/remove server-side via endpoint dedicado)
  async function handleToggleEtiqueta(id: string, key: string, action: "add" | "remove") {
    await fetch(`/api/setor-tecnico/${id}/etiquetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, action }),
    });
    await fetchRegistros();
  }

  function iniciarTrocaEtapa(r: RegistroTecnico, trilho: "PROJETO" | "INSTALACAO") {
    setTrocandoEtapaId(r.id);
    setNovaEtapaTrilho(trilho);
    setNovaEtapaSel(trilho === "PROJETO" ? r.etapa : r.etapaInstalacao);
  }

  async function salvarTrocaEtapa(id: string) {
    setSaving(true);
    setErroMsg("");
    try {
      const payload = novaEtapaTrilho === "PROJETO"
        ? { etapa: novaEtapaSel }
        : { etapaInstalacao: novaEtapaSel };
      const res = await fetch(`/api/setor-tecnico/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || `Erro ${res.status} ao alterar etapa`);
        return;
      }
      setTrocandoEtapaId(null);
      await fetchRegistros();
    } finally { setSaving(false); }
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
    } catch { setErroMsg("Erro ao remover"); }
  }

  async function handleFileUpload(r: RegistroTecnico, file: File) {
    if (file.size > 15 * 1024 * 1024) {
      setErroMsg("Arquivo muito grande. Maximo 15MB.");
      return;
    }
    const allowedTypes = ["application/pdf","image/png","image/jpeg","image/jpg","image/gif","image/webp"];
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
    } catch { setErroMsg("Erro ao processar arquivo"); }
    finally {
      setUploadingId(null);
      const input = fileInputRefs.current[r.id];
      if (input) input.value = "";
    }
  }

  async function handleAdicionarComentario(r: RegistroTecnico) {
    const texto = novoComentario[r.id]?.trim();
    if (!texto) return;
    setSalvandoComentario(r.id);
    try {
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
    } catch { setErroMsg("Erro ao salvar comentario"); }
    finally { setSalvandoComentario(null); }
  }

  async function handleRemoveAnexo(r: RegistroTecnico, idx: number) {
    if (!confirm("Excluir este anexo?")) return;
    try {
      const atual = parseAnexos(r.anexos)[idx];
      if (!atual) { setErroMsg("Anexo nao encontrado no estado local"); return; }
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
    } catch { setErroMsg("Erro ao excluir anexo"); }
  }

  async function handleExcluirComentario(r: RegistroTecnico, comentarioId: string) {
    if (!confirm("Excluir este comentario?")) return;
    try {
      const res = await fetch(`/api/setor-tecnico/${r.id}/comentarios/${comentarioId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao excluir comentario");
        return;
      }
      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch { setErroMsg("Erro ao excluir comentario"); }
  }

  async function handleSalvarDataVistoria(r: RegistroTecnico, valor: string) {
    try {
      const res = await fetch(`/api/setor-tecnico/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataVistoria: valor || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao salvar data de vistoria");
        return;
      }
      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch { setErroMsg("Erro ao salvar data de vistoria"); }
  }

  async function handleSalvarDataInstalacao(r: RegistroTecnico, valor: string) {
    try {
      const res = await fetch(`/api/setor-tecnico/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataInstalacao: valor || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao salvar data de instalacao");
        return;
      }
      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch { setErroMsg("Erro ao salvar data de instalacao"); }
  }

  async function handleSalvarCampoInstalacao(r: RegistroTecnico, campo: "cidadeInstalacao" | "enderecoInstalacao", valor: string) {
    try {
      const res = await fetch(`/api/setor-tecnico/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao salvar localizacao da instalacao");
        return;
      }
      await fetchRegistros();
      await loadDetalhes(r.id);
    } catch { setErroMsg("Erro ao salvar localizacao da instalacao"); }
  }

  const podeEditarVistoria = canEditVistoria(session?.user?.role);
  const podeEditarInstalacao = canEditInstalacao(session?.user?.role);
  const podeEditarCustoMaterial = canEditCustoMaterial(session?.user?.role);

  // Salva o custo real do material (endpoint dedicado, so engenharia edita)
  async function handleSalvarCustoMaterial(r: RegistroTecnico, valor: string) {
    const v = valor.trim();
    // Nao re-salva se nao mudou
    const atual = r.custoMaterialReal != null ? String(r.custoMaterialReal) : "";
    if (v === atual) return;
    try {
      const res = await fetch(`/api/setor-tecnico/${r.id}/custo-material`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custoMaterialReal: v === "" ? null : v }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao salvar custo do material");
        return;
      }
      await fetchRegistros();
    } catch { setErroMsg("Erro ao salvar custo do material"); }
  }

  // Define/limpa a cor da margem do material (toggle manual)
  async function handleSalvarStatusMaterial(r: RegistroTecnico, status: string) {
    const novo = r.statusMaterial === status ? null : status;
    try {
      const res = await fetch(`/api/setor-tecnico/${r.id}/custo-material`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusMaterial: novo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErroMsg(err.error || "Erro ao salvar cor do material");
        return;
      }
      await fetchRegistros();
    } catch { setErroMsg("Erro ao salvar cor do material"); }
  }

  // Contagens por aba (calculadas em cima do array completo)
  const countProjetos = filtrarPorAba(registros, "PROJETOS").length;
  const countProjetosConcluidos = filtrarPorAba(registros, "PROJETOS_CONCLUIDOS").length;
  const countInstalacoes = filtrarPorAba(registros, "INSTALACOES").length;
  const countConcluidos = filtrarPorAba(registros, "CONCLUIDOS").length;

  // Aplica filtro da aba + filtro por etapa especifica
  let clientesFiltrados = filtrarPorAba(registros, abaAtiva);
  if (filterEtapa) {
    // Filtro de etapa aplica ao trilho relevante da aba ativa.
    // Projetos/Concluidos -> etapa (PROJETO). Instalacoes/Concluidos -> etapaInstalacao.
    const trilhoFiltro: "PROJETO" | "INSTALACAO" =
      abaAtiva === "PROJETOS" || abaAtiva === "PROJETOS_CONCLUIDOS" ? "PROJETO" : "INSTALACAO";
    clientesFiltrados = clientesFiltrados.filter((r) =>
      trilhoFiltro === "PROJETO" ? r.etapa === filterEtapa : r.etapaInstalacao === filterEtapa,
    );
  }
  const buscaNorm = buscaNome.trim().toLowerCase();
  if (buscaNorm) {
    clientesFiltrados = clientesFiltrados.filter((r) =>
      (r.nomeCliente || "").toLowerCase().includes(buscaNorm) ||
      (r.codigoLocalizador || "").toLowerCase().includes(buscaNorm) ||
      (r.telefone || "").toLowerCase().includes(buscaNorm),
    );
  }
  clientesFiltrados = [...clientesFiltrados].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Lista de etapas pra exibir no filtro lateral (depende da aba)
  const etapasDoFiltro =
    abaAtiva === "PROJETOS" || abaAtiva === "PROJETOS_CONCLUIDOS"
      ? ETAPAS_PROJETO
      : ETAPAS_INSTALACAO;
  const trilhoDoFiltro: "PROJETO" | "INSTALACAO" =
    abaAtiva === "PROJETOS" || abaAtiva === "PROJETOS_CONCLUIDOS" ? "PROJETO" : "INSTALACAO";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação · Setor Técnico"
        title="Setor Técnico"
        subtitle={`${clientesFiltrados.length} ${abaAtiva === "PROJETOS" ? "projetos" : abaAtiva === "PROJETOS_CONCLUIDOS" ? "projetos concluidos" : abaAtiva === "INSTALACOES" ? "instalacoes" : "concluidos"}${filterEtapa ? ` em "${trilhoDoFiltro === "PROJETO" ? getLabelProjeto(filterEtapa) : getLabelInstalacao(filterEtapa)}"` : ""}`}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-liv-sage text-liv-bg rounded-xl font-semibold text-sm hover:bg-liv-sage-deep transition"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        }
      />

      <div className="max-w-5xl mx-auto">
        <OperacaoNav />

        {erroMsg && (
          <div className="mb-4 flex items-center gap-3 bg-liv-danger/10 border border-liv-danger/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-liv-danger shrink-0" />
            <p className="text-sm text-liv-danger">{erroMsg}</p>
            <button onClick={() => setErroMsg("")} className="ml-auto text-liv-danger hover:text-liv-danger/70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form novo projeto */}
        {showForm && (
          <div className="bg-liv-surface border border-liv-teal/30 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-liv-teal uppercase tracking-wider mb-4">
              Novo Projeto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-liv-faint mb-1">Nome do Cliente *</label>
                <input
                  value={form.nomeCliente}
                  onChange={(e) => setForm((p) => ({ ...p, nomeCliente: e.target.value }))}
                  className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-xs text-liv-faint mb-1">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                  className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                  placeholder="(84) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-xs text-liv-faint mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                  placeholder="cliente@email.com"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-xs text-liv-faint mb-1">Etapa Projeto</label>
                <select
                  value={form.etapa}
                  onChange={(e) => setForm((p) => ({ ...p, etapa: e.target.value }))}
                  className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                >
                  {ETAPAS_PROJETO.map((et) => (
                    <option key={et.key} value={et.key}>{et.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-liv-faint mb-1">Etapa Instalacao</label>
                <select
                  value={form.etapaInstalacao}
                  onChange={(e) => setForm((p) => ({ ...p, etapaInstalacao: e.target.value }))}
                  className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                >
                  {ETAPAS_INSTALACAO.map((et) => (
                    <option key={et.key} value={et.key}>{et.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs text-liv-faint mb-1">Observacoes</label>
                <input
                  value={form.observacoes}
                  onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                  className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                  placeholder="Notas adicionais"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={saving || !form.nomeCliente.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-liv-sage text-liv-bg rounded-lg text-sm font-medium hover:bg-liv-sage-deep disabled:opacity-50 transition"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? "Salvando..." : "Cadastrar"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(FORM_INICIAL); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-liv-surface-2 text-liv-muted rounded-lg text-sm font-medium hover:bg-liv-line transition"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* 4 abas */}
        <div className="mb-4 flex gap-1 bg-liv-surface border border-liv-line rounded-xl p-1 w-fit flex-wrap">
          <button
            onClick={() => { setAbaAtiva("PROJETOS"); setFilterEtapa(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "PROJETOS" ? "bg-liv-sage text-liv-bg" : "text-liv-muted hover:text-liv-ink"
            }`}
          >
            Projetos ({countProjetos})
          </button>
          <button
            onClick={() => { setAbaAtiva("PROJETOS_CONCLUIDOS"); setFilterEtapa(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "PROJETOS_CONCLUIDOS" ? "bg-liv-sage-deep text-liv-ink" : "text-liv-muted hover:text-liv-ink"
            }`}
          >
            Projetos Concluidos ({countProjetosConcluidos})
          </button>
          <button
            onClick={() => { setAbaAtiva("INSTALACOES"); setFilterEtapa(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "INSTALACOES" ? "bg-liv-info text-liv-bg" : "text-liv-muted hover:text-liv-ink"
            }`}
          >
            Instalacoes ({countInstalacoes})
          </button>
          <button
            onClick={() => { setAbaAtiva("CONCLUIDOS"); setFilterEtapa(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              abaAtiva === "CONCLUIDOS" ? "bg-liv-sage text-liv-bg" : "text-liv-muted hover:text-liv-ink"
            }`}
          >
            Concluidos ({countConcluidos})
          </button>
        </div>

        {/* Busca por nome */}
        <div className="mb-4 relative max-w-md">
          <Search className="w-4 h-4 text-liv-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg pl-9 pr-9 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
            placeholder="Buscar por código, nome ou telefone..."
          />
          {buscaNome && (
            <button
              onClick={() => setBuscaNome("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-liv-faint hover:text-liv-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro por etapa do trilho ativo */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterEtapa(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !filterEtapa
                ? "bg-liv-teal text-liv-bg"
                : "bg-liv-surface-2 text-liv-muted hover:bg-liv-line"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Todas etapas ({clientesFiltrados.length})
          </button>
          {etapasDoFiltro.map((et) => {
            const count = filtrarPorAba(registros, abaAtiva).filter((r) =>
              trilhoDoFiltro === "PROJETO" ? r.etapa === et.key : r.etapaInstalacao === et.key,
            ).length;
            const cores = ETAPA_TECNICO_CORES[et.key];
            return (
              <button
                key={et.key}
                onClick={() => setFilterEtapa(et.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterEtapa === et.key
                    ? `${cores.bg} ${cores.text}`
                    : count > 0
                      ? "bg-liv-surface-2 text-liv-muted hover:bg-liv-line"
                      : "bg-liv-bg text-liv-faint cursor-pointer hover:bg-liv-surface"
                }`}
              >
                {et.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Lista de cards */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage" />
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center text-liv-faint py-12 bg-liv-surface rounded-xl border border-liv-line">
            Nenhum projeto encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {clientesFiltrados.map((r) => {
              const isEditing = editingId === r.id;
              const coresProjeto = ETAPA_TECNICO_CORES[r.etapa] ?? { bg: "bg-liv-surface-2", text: "text-liv-muted", border: "border-liv-line" };
              const coresInstalacao = ETAPA_TECNICO_CORES[r.etapaInstalacao] ?? { bg: "bg-liv-surface-2", text: "text-liv-muted", border: "border-liv-line" };
              const anexos = parseAnexos(r.anexos);
              const historico = parseHistorico(r.historicoAcoes);
              const comentarios = parseComentarios(r.comentarios);
              const etiquetas = parseEtiquetas(r.etiquetas);
              const proximaProjeto = getProximaEtapaProjeto(r.etapa);
              const proximaInstalacao = getProximaEtapaInstalacao(r.etapaInstalacao);
              const isExpanded = expandedId === r.id;
              const anexosCount = r.anexosCount ?? anexos.length;
              const comentariosCount = r.comentariosCount ?? comentarios.length;

              return (
                <div key={r.id}>
                  {!isEditing && (
                    <div className="bg-liv-surface border border-liv-line rounded-xl transition hover:border-liv-sage/40">
                      {/* Header clicavel */}
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="w-full text-left p-5 flex items-center gap-4"
                      >
                        <ChevronDown
                          className={`w-5 h-5 text-liv-faint shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-liv-ink truncate">
                              {r.nomeCliente}
                            </h3>
                            {r.codigoLocalizador && (
                              <span
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(r.codigoLocalizador!); }}
                                title="Copiar código do cliente"
                                className="shrink-0 text-xs font-mono px-1.5 py-0.5 rounded bg-liv-surface-2 text-liv-muted hover:text-liv-ink border border-liv-line cursor-pointer"
                              >
                                #{r.codigoLocalizador}
                              </span>
                            )}
                            {r.telefone && (
                              <span className="hidden sm:flex items-center gap-1.5 text-sm text-liv-faint">
                                <Phone className="w-3.5 h-3.5" />
                                {r.telefone}
                              </span>
                            )}
                          </div>
                          {etiquetas.length > 0 && (
                            <div className="mt-1.5">
                              <EtiquetasChips etiquetas={etiquetas} />
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-liv-faint">
                            {r.vendedorNome && (
                              <span className="flex items-center gap-1 shrink-0">
                                <User className="w-3 h-3" />
                                {r.vendedorNome}
                              </span>
                            )}
                            {r.proximaAcao && (
                              <span className="truncate max-w-[200px]">
                                <span className="text-liv-faint">Proxima:</span>{" "}
                                <span className="text-liv-teal/80">{r.proximaAcao}</span>
                              </span>
                            )}
                            {anexosCount > 0 && (
                              <span className="flex items-center gap-1 text-liv-faint shrink-0">
                                <Paperclip className="w-3 h-3" />
                                {anexosCount}
                              </span>
                            )}
                            {comentariosCount > 0 && (
                              <span className="flex items-center gap-1 text-liv-faint shrink-0">
                                <MessageSquare className="w-3 h-3" />
                                {comentariosCount}
                              </span>
                            )}
                            {(r.custoMaterialReal != null || r.statusMaterial) && (
                              <span
                                title="Custo do material (CA)"
                                className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full text-[11px] font-bold border tabular-nums ${
                                  r.statusMaterial
                                    ? `${STATUS_MATERIAL_CORES[r.statusMaterial].bg} ${STATUS_MATERIAL_CORES[r.statusMaterial].text} ${STATUS_MATERIAL_CORES[r.statusMaterial].border}`
                                    : "text-liv-muted border-liv-line"
                                }`}
                              >
                                CA {r.custoMaterialReal != null ? formatCurrency(r.custoMaterialReal) : "—"}
                              </span>
                            )}
                            <span className="flex items-center gap-1 shrink-0" title="Data de vistoria">
                              <Calendar className="w-3 h-3" />
                              <span>Vist:</span>
                              <span className={r.dataVistoria ? "text-liv-muted tabular-nums" : ""}>{r.dataVistoria ? formatDate(r.dataVistoria) : "—"}</span>
                            </span>
                            <span className="flex items-center gap-1 shrink-0" title="Data de instalacao">
                              <Hammer className="w-3 h-3" />
                              <span>Inst:</span>
                              <span className={r.dataInstalacao ? "text-liv-muted tabular-nums" : ""}>{r.dataInstalacao ? formatDate(r.dataInstalacao) : "—"}</span>
                            </span>
                          </div>
                        </div>
                        {/* Duas badges: trilho PROJETO + trilho INSTALACAO */}
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${coresProjeto.bg} ${coresProjeto.text}`}
                            title="Trilho Projeto"
                          >
                            <FileText className="w-3 h-3" />
                            {getLabelProjeto(r.etapa)}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${coresInstalacao.bg} ${coresInstalacao.text}`}
                            title="Trilho Instalacao"
                          >
                            <Hammer className="w-3 h-3" />
                            {getLabelInstalacao(r.etapaInstalacao)}
                          </span>
                        </div>
                      </button>

                      {/* Expandido */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-liv-line">
                          <div className="mt-4 mb-4">
                            <p className="text-xs text-liv-faint font-semibold uppercase mb-2">Etiquetas</p>
                            <EtiquetasSelector
                              etiquetas={etiquetas}
                              onToggle={(key, action) => handleToggleEtiqueta(r.id, key, action)}
                              disabled={saving}
                            />
                          </div>
                          {r.venda && (
                            <div className="mt-4 mb-4 p-3 bg-liv-surface-2 rounded-lg border border-liv-line">
                              <p className="text-xs text-liv-faint font-semibold uppercase mb-2">Dados da Venda</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <p className="text-xs text-liv-faint">Valor</p>
                                  <p className="text-sm text-liv-teal font-semibold tabular-nums">{formatCurrency(r.venda.valorVenda)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-liv-faint">kWp</p>
                                  <p className="text-sm text-liv-muted font-semibold tabular-nums">{r.venda.kwp}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-liv-faint">Placas</p>
                                  <p className="text-sm text-liv-muted font-semibold tabular-nums">{r.venda.quantidadePlacas}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-liv-faint">Cliente</p>
                                  <p className="text-sm text-liv-muted font-semibold truncate">{r.venda.cliente}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-3">
                              {r.ultimaAcao && (
                                <div>
                                  <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Ultima Acao</p>
                                  <p className="text-sm text-liv-muted">{r.ultimaAcao}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Criado em</p>
                                <div className="flex items-center gap-2 text-sm text-liv-muted">
                                  <Calendar className="w-4 h-4 text-liv-faint" />
                                  {formatDate(r.createdAt)}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {r.proximaAcao && (
                                <div>
                                  <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Proxima Acao</p>
                                  <p className="text-sm text-liv-teal font-medium">{r.proximaAcao}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {historico.length > 0 && (
                            <div className="mb-4 p-3 bg-liv-surface-2 rounded-lg border border-liv-line">
                              <p className="text-xs text-liv-faint font-semibold uppercase mb-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Historico de Acoes
                              </p>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {historico.map((h, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-liv-faint text-xs whitespace-nowrap mt-0.5">{formatDate(h.data)}</span>
                                    <span className="text-liv-muted">{h.acao}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.observacoes && (
                            <div className="mb-4 p-3 bg-liv-surface-2 rounded-lg border border-liv-line">
                              <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Observacoes</p>
                              <p className="text-sm text-liv-muted">{r.observacoes}</p>
                            </div>
                          )}

                          {/* Anexos */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-liv-faint font-semibold uppercase flex items-center gap-1.5">
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
                                      ? "bg-liv-teal/10 text-liv-teal opacity-50 cursor-wait"
                                      : "bg-liv-teal/10 text-liv-teal hover:bg-liv-teal/20 border border-liv-teal/30"
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
                                  <div key={i} className="flex items-center gap-2 p-2 bg-liv-surface-2 rounded-lg border border-liv-line">
                                    <FileText className="w-4 h-4 text-liv-teal shrink-0" />
                                    <span className="text-sm text-liv-muted truncate flex-1">{a.nome}</span>
                                    <span className="text-xs text-liv-faint whitespace-nowrap">{formatDate(a.data)}</span>
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
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-liv-info hover:bg-liv-info/10 border border-liv-info/30 transition shrink-0"
                                      title="Visualizar"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={a.url}
                                      download={a.nome}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-liv-teal hover:bg-liv-teal/10 border border-liv-teal/30 transition shrink-0"
                                      title="Baixar"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                      onClick={() => handleRemoveAnexo(r, i)}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-liv-danger hover:bg-liv-danger/10 border border-liv-danger/30 transition shrink-0"
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
                            <p className="text-xs text-liv-faint font-semibold uppercase mb-2 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Comentarios ({comentarios.length})
                            </p>
                            {comentarios.length > 0 && (
                              <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                                {comentarios.map((c) => (
                                  <div key={c.id} className="p-3 bg-liv-surface-2 rounded-lg border border-liv-line">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-liv-teal">{c.autor}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-liv-faint">{formatDate(c.criadoEm)}</span>
                                        <button
                                          onClick={() => handleExcluirComentario(r, c.id)}
                                          className="text-liv-faint hover:text-liv-danger transition"
                                          title="Excluir comentario"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-liv-muted">{c.texto}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                value={novoComentario[r.id] || ""}
                                onChange={(e) => setNovoComentario((p) => ({ ...p, [r.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAdicionarComentario(r);
                                  }
                                }}
                                className="flex-1 bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                placeholder="Escreva um comentario..."
                              />
                              <button
                                onClick={() => handleAdicionarComentario(r)}
                                disabled={salvandoComentario === r.id || !novoComentario[r.id]?.trim()}
                                className="flex items-center gap-1.5 px-3 py-2 bg-liv-sage text-liv-bg rounded-lg text-sm font-medium hover:bg-liv-sage-deep disabled:opacity-50 transition"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {salvandoComentario === r.id ? "..." : "Enviar"}
                              </button>
                            </div>
                          </div>

                          {/* Acoes: dois botoes de avancar (um por trilho) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {proximaProjeto ? (
                              <button
                                onClick={() => handleAvancarProjeto(r)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-liv-sage/10 text-liv-sage text-sm font-semibold rounded-lg border border-liv-sage/30 hover:bg-liv-sage/20 transition"
                              >
                                <FileText className="w-4 h-4" />
                                Projeto: {getLabelProjeto(proximaProjeto)}
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-liv-surface-2 text-liv-faint text-sm rounded-lg border border-liv-line">
                                <FileText className="w-4 h-4" />
                                Projeto concluido
                              </div>
                            )}
                            {proximaInstalacao ? (
                              <button
                                onClick={() => handleAvancarInstalacao(r)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-liv-info/10 text-liv-info text-sm font-semibold rounded-lg border border-liv-info/30 hover:bg-liv-info/20 transition"
                              >
                                <Hammer className="w-4 h-4" />
                                Instalacao: {getLabelInstalacao(proximaInstalacao)}
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-liv-surface-2 text-liv-faint text-sm rounded-lg border border-liv-line">
                                <Hammer className="w-4 h-4" />
                                Instalacao concluida
                              </div>
                            )}
                          </div>

                          {/* Data de vistoria (engenharia) — edicao exclusiva do engenheiro/diretor/admin */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-liv-faint uppercase tracking-wider">Data de vistoria</span>
                            {podeEditarVistoria ? (
                              <input
                                type="date"
                                value={r.dataVistoria ?? ""}
                                onChange={(e) => handleSalvarDataVistoria(r, e.target.value)}
                                className="bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-sm text-liv-ink focus:border-liv-sage outline-none"
                              />
                            ) : (
                              <span className="text-sm text-liv-muted tabular-nums">{r.dataVistoria ? formatDate(r.dataVistoria) : "—"}</span>
                            )}
                          </div>

                          {/* Data de instalacao — engenheiro (TECNICO) + Pos-Venda podem editar */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-liv-faint uppercase tracking-wider">Data de instalacao</span>
                            {podeEditarInstalacao ? (
                              <input
                                type="date"
                                value={r.dataInstalacao ?? ""}
                                onChange={(e) => handleSalvarDataInstalacao(r, e.target.value)}
                                className="bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-sm text-liv-ink focus:border-liv-sage outline-none"
                              />
                            ) : (
                              <span className="text-sm text-liv-muted tabular-nums">{r.dataInstalacao ? formatDate(r.dataInstalacao) : "—"}</span>
                            )}
                          </div>

                          {/* Localizacao da instalacao — alimenta o Mapa de Usinas. Engenheiro preenche. */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-liv-faint uppercase tracking-wider">Cidade da instalacao</span>
                            {podeEditarInstalacao ? (
                              <input
                                type="text"
                                placeholder="ex: Natal"
                                defaultValue={r.cidadeInstalacao ?? ""}
                                onBlur={(e) => { if ((e.target.value || "") !== (r.cidadeInstalacao ?? "")) handleSalvarCampoInstalacao(r, "cidadeInstalacao", e.target.value); }}
                                className="bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-sm text-liv-ink focus:border-liv-sage outline-none w-40"
                              />
                            ) : (
                              <span className="text-sm text-liv-muted">{r.cidadeInstalacao || "—"}</span>
                            )}
                          </div>
                          {/* Endereco da geradora — OBRIGATORIO para marcar como instalada */}
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-liv-faint uppercase tracking-wider">Endereco da geradora <span className="text-red-400">*</span></span>
                            {podeEditarInstalacao ? (
                              <input
                                type="text"
                                placeholder="rua, numero, bairro"
                                defaultValue={r.enderecoInstalacao ?? ""}
                                onBlur={(e) => { if ((e.target.value || "") !== (r.enderecoInstalacao ?? "")) handleSalvarCampoInstalacao(r, "enderecoInstalacao", e.target.value); }}
                                className={`bg-liv-surface-2 border rounded-lg px-2 py-1 text-sm text-liv-ink focus:border-liv-sage outline-none flex-1 min-w-[200px] ${r.enderecoInstalacao ? "border-liv-line" : "border-red-400/60"}`}
                              />
                            ) : (
                              <span className="text-sm text-liv-muted">{r.enderecoInstalacao || "—"}</span>
                            )}
                            {r.enderecoInstalacao && (
                              <span className="text-[10px] text-liv-faint" title="Aparece no Mapa de Usinas">no mapa ✓</span>
                            )}
                          </div>
                          {["INSTALACAO_CONCLUIDA","SOLICITADO_VISTORIA","REDE_LIGADA"].includes(r.etapaInstalacao) && !r.enderecoInstalacao && (
                            <p className="mt-1 text-xs text-red-400">⚠ Falta o endereco da geradora desta usina — preencha para aparecer no mapa.</p>
                          )}

                          {/* Custo do material CA — engenharia (Pedro) lanca; alimenta a Margem de Instalacao */}
                          {(r.etapaInstalacao === "MATERIAL_COMPRADO" || r.custoMaterialReal != null || r.statusMaterial) && (
                            <div className="mt-3 p-3 rounded-lg border border-liv-line bg-liv-surface-2">
                              <p className="text-xs text-liv-faint uppercase tracking-wider mb-2">Custo do material (CA)</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                {podeEditarCustoMaterial ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-liv-faint">R$</span>
                                    <input
                                      key={`custo-${r.id}-${r.custoMaterialReal ?? ""}`}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      inputMode="decimal"
                                      defaultValue={r.custoMaterialReal != null ? String(r.custoMaterialReal) : ""}
                                      onBlur={(e) => handleSalvarCustoMaterial(r, e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                      placeholder="0,00"
                                      className="w-28 bg-liv-surface border border-liv-line rounded-lg px-2 py-1 text-sm text-liv-ink text-right tabular-nums focus:border-liv-sage outline-none"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm text-liv-ink font-semibold tabular-nums">
                                    {r.custoMaterialReal != null ? formatCurrency(r.custoMaterialReal) : "—"}
                                  </span>
                                )}

                                {/* Cor manual verde / amarelo / vermelho */}
                                <div className="flex items-center gap-1.5">
                                  {["VERDE", "AMARELO", "VERMELHO"].map((s) => {
                                    const c = STATUS_MATERIAL_CORES[s];
                                    const ativo = r.statusMaterial === s;
                                    if (podeEditarCustoMaterial) {
                                      return (
                                        <button
                                          key={s}
                                          type="button"
                                          onClick={() => handleSalvarStatusMaterial(r, s)}
                                          title={s}
                                          className={`w-6 h-6 rounded-full transition ${c.dot} ${
                                            ativo ? "ring-2 ring-offset-2 ring-offset-liv-surface-2 ring-white/70 scale-110" : "opacity-40 hover:opacity-80"
                                          }`}
                                        />
                                      );
                                    }
                                    return ativo ? (
                                      <span key={s} className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>{s}</span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                              <p className="text-[10px] text-liv-faint mt-2">
                                Aparece na página Margem de Instalação. O detalhe do custo a mais vai no comentário.
                              </p>
                            </div>
                          )}

                          {/* Alterar etapa manual + Editar + Remover */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {trocandoEtapaId === r.id ? (
                              <div className="flex items-center gap-2 flex-1 flex-wrap">
                                <select
                                  value={novaEtapaTrilho}
                                  onChange={(e) => {
                                    const t = e.target.value as "PROJETO" | "INSTALACAO";
                                    setNovaEtapaTrilho(t);
                                    setNovaEtapaSel(t === "PROJETO" ? r.etapa : r.etapaInstalacao);
                                  }}
                                  className="bg-liv-surface-2 border border-liv-sage/50 rounded-lg px-2 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                >
                                  <option value="PROJETO">Trilho Projeto</option>
                                  <option value="INSTALACAO">Trilho Instalacao</option>
                                </select>
                                <select
                                  value={novaEtapaSel}
                                  onChange={(e) => setNovaEtapaSel(e.target.value)}
                                  className="flex-1 bg-liv-surface-2 border border-liv-sage/50 rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                >
                                  {(novaEtapaTrilho === "PROJETO" ? ETAPAS_PROJETO : ETAPAS_INSTALACAO).map((et) => (
                                    <option key={et.key} value={et.key}>{et.label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => salvarTrocaEtapa(r.id)}
                                  disabled={saving}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-liv-sage text-liv-bg rounded-lg text-sm font-medium hover:bg-liv-sage-deep disabled:opacity-50 transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {saving ? "..." : "Salvar"}
                                </button>
                                <button
                                  onClick={() => setTrocandoEtapaId(null)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-liv-surface-2 text-liv-muted rounded-lg text-sm font-medium hover:bg-liv-line transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => iniciarTrocaEtapa(r, "PROJETO")}
                                  className="flex items-center gap-2 px-3 py-2 text-liv-sage bg-liv-sage/10 rounded-lg hover:bg-liv-sage/20 border border-liv-sage/30 transition text-xs font-semibold"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Alterar Projeto
                                </button>
                                <button
                                  onClick={() => iniciarTrocaEtapa(r, "INSTALACAO")}
                                  className="flex items-center gap-2 px-3 py-2 text-liv-info bg-liv-info/10 rounded-lg hover:bg-liv-info/20 border border-liv-info/30 transition text-xs font-semibold"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Alterar Instalacao
                                </button>
                                <button
                                  onClick={() => startEdit(r)}
                                  className="flex items-center gap-2 px-3 py-2 text-liv-muted bg-liv-surface-2 rounded-lg hover:bg-liv-line transition text-xs font-semibold"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleRemover(r.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-liv-danger bg-liv-danger/10 rounded-lg hover:bg-liv-danger/20 border border-liv-danger/20 transition text-xs font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remover
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edicao inline */}
                  {isEditing && (
                    <div className="bg-liv-surface border border-liv-teal/30 rounded-xl p-5 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Nome</label>
                          <input
                            value={editForm.nomeCliente}
                            onChange={(e) => setEditForm((p) => ({ ...p, nomeCliente: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Telefone</label>
                          <input
                            value={editForm.telefone}
                            onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Email</label>
                          <input
                            value={editForm.email}
                            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                            type="email"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Etapa Projeto</label>
                          <select
                            value={editForm.etapa}
                            onChange={(e) => setEditForm((p) => ({ ...p, etapa: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                          >
                            {ETAPAS_PROJETO.map((et) => (
                              <option key={et.key} value={et.key}>{et.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Etapa Instalacao</label>
                          <select
                            value={editForm.etapaInstalacao}
                            onChange={(e) => setEditForm((p) => ({ ...p, etapaInstalacao: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                          >
                            {ETAPAS_INSTALACAO.map((et) => (
                              <option key={et.key} value={et.key}>{et.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Ultima Acao</label>
                          <input
                            value={editForm.ultimaAcao}
                            onChange={(e) => setEditForm((p) => ({ ...p, ultimaAcao: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                            placeholder="Ex: Enviado projeto para analise"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Proxima Acao</label>
                          <input
                            value={editForm.proximaAcao}
                            onChange={(e) => setEditForm((p) => ({ ...p, proximaAcao: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                            placeholder="Ex: Aguardar aprovacao COSERN"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-liv-faint mb-1">Observacoes</label>
                          <input
                            value={editForm.observacoes}
                            onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))}
                            className="w-full bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                            placeholder="Notas adicionais"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(r.id)}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-liv-sage text-liv-bg rounded-lg text-sm font-medium hover:bg-liv-sage-deep disabled:opacity-50 transition"
                        >
                          <Check className="w-4 h-4" />
                          {saving ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-liv-surface-2 text-liv-muted rounded-lg text-sm font-medium hover:bg-liv-line transition"
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
    </div>
  );
}

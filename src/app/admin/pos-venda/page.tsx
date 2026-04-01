"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Calendar,
  AlertCircle,
  Phone,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Pencil,
  Filter,
  User,
  Trash2,
  Clock,
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
  conferido: boolean;
  dataConferido: string | null;
  checklistSupervisao: string | null;
  prazoFinalizacao: string | null;
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

export default function AdminPosVendaPage() {
  const [registros, setRegistros] = useState<PosVendaRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"operacional" | "supervisao">("supervisao");
  const [conferindoId, setConferindoId] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "semana" | "mes">("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(FORM_INICIAL);
  const [trocandoEtapaId, setTrocandoEtapaId] = useState<string | null>(null);
  const [novaEtapaSel, setNovaEtapaSel] = useState("");
  const [erroMsg, setErroMsg] = useState("");

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

  function startEdit(r: PosVendaRegistro) {
    setEditingId(r.id);
    setTrocandoEtapaId(null);
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
        setErroMsg(err.error || `Erro ${res.status}`);
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
    const res = await fetch(`/api/pos-venda/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: proxima }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setErroMsg(err.error || `Erro ao avançar`);
      return;
    }
    await fetchRegistros();
  }

  function iniciarTrocaEtapa(r: PosVendaRegistro) {
    setTrocandoEtapaId(r.id);
    setEditingId(null);
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
        setErroMsg(err.error || `Erro ${res.status}`);
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

  // Filtrar por período
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

  const clientesFiltrados = filtroEtapa
    ? registrosPeriodo.filter((r) => r.etapa === filtroEtapa)
    : registrosPeriodo;

  const contadores = ETAPAS_POS_VENDA.reduce((acc, et) => {
    acc[et.key] = registrosPeriodo.filter((r) => r.etapa === et.key).length;
    return acc;
  }, {} as Record<string, number>);

  const vencidos = registrosPeriodo.filter(
    (r) => r.proximoContato && r.proximoContato < hoje
  ).length;

  const sorted = [...clientesFiltrados].sort((a, b) => {
    const aV = a.proximoContato && a.proximoContato < hoje;
    const bV = b.proximoContato && b.proximoContato < hoje;
    if (aV && !bV) return -1;
    if (!aV && bV) return 1;
    return (a.proximoContato || "9999-99-99").localeCompare(b.proximoContato || "9999-99-99");
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
                Visão Pós Venda
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {clientesFiltrados.length} clientes
                {filtroEtapa && ` em "${getEtapaLabel(filtroEtapa as EtapaPosVenda)}"`}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-1 w-fit mb-6">
            <button
              onClick={() => setAbaAtiva("supervisao")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                abaAtiva === "supervisao"
                  ? "bg-orange-400 text-gray-900"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Visão Supervisão
            </button>
            <button
              onClick={() => setAbaAtiva("operacional")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                abaAtiva === "operacional"
                  ? "bg-orange-400 text-gray-900"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Lista Operacional
            </button>
          </div>

          {/* ── ABA VISÃO SUPERVISÃO ── */}
          {abaAtiva === "supervisao" && (() => {
            const total = registros.length;
            const conferidos = registros.filter(r => r.conferido).length;
            const pendentes = total - conferidos;
            const atrasados = registros.filter(r => !r.conferido && r.proximoContato && r.proximoContato < hoje).length;

            type ChecklistItem = { key: string; label: string; concluido: boolean };

            function parseChecklist(r: PosVendaRegistro): ChecklistItem[] {
              try {
                if (r.checklistSupervisao) return JSON.parse(r.checklistSupervisao);
              } catch { /* ignore */ }
              return [
                { key: "visita_tecnica",     label: "Visita Técnica",     concluido: false },
                { key: "solicitacao_cosern", label: "Solicitação Cosern", concluido: false },
                { key: "card_fechado",       label: "Card Fechado",       concluido: false },
                { key: "contrato_assinado",  label: "Contrato Assinado",  concluido: false },
              ];
            }

            async function toggleConferido(r: PosVendaRegistro) {
              setConferindoId(r.id);
              const novoConferido = !r.conferido;
              await fetch(`/api/pos-venda/${r.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  conferido: novoConferido,
                  dataConferido: novoConferido ? hoje : null,
                }),
              });
              await fetchRegistros();
              setConferindoId(null);
            }

            async function toggleChecklistItem(r: PosVendaRegistro, key: string) {
              const items = parseChecklist(r);
              const updated = items.map(i => i.key === key ? { ...i, concluido: !i.concluido } : i);
              const allDone = updated.every(i => i.concluido);
              await fetch(`/api/pos-venda/${r.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  checklistSupervisao: JSON.stringify(updated),
                  ...(allDone && !r.conferido ? { conferido: true, dataConferido: hoje } : {}),
                }),
              });
              await fetchRegistros();
            }

            return (
              <div className="space-y-6">
                {/* 4 KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b]">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-gray-100 mt-1">{total}</p>
                    <p className="text-xs text-gray-500 mt-1">clientes ativos</p>
                  </div>
                  <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b]">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Conferidos</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{conferidos}</p>
                    <p className="text-xs text-gray-500 mt-1">{total > 0 ? Math.round(conferidos / total * 100) : 0}% do total</p>
                  </div>
                  <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b]">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">{pendentes}</p>
                    <p className="text-xs text-gray-500 mt-1">aguardando revisão</p>
                  </div>
                  <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b]">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Atrasados</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{atrasados}</p>
                    <p className="text-xs text-gray-500 mt-1">prazo vencido</p>
                  </div>
                </div>

                {/* Lista de acompanhamento */}
                <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#232a3b] flex items-center justify-between">
                    <p className="font-medium text-gray-100 text-sm">Acompanhamento por Cliente</p>
                    <p className="text-xs text-gray-500">{conferidos}/{total} concluídos</p>
                  </div>
                  {loading ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">Carregando...</div>
                  ) : registros.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum cliente cadastrado</div>
                  ) : (
                    <div className="divide-y divide-[#232a3b]">
                      {registros.map((r) => {
                        const items = parseChecklist(r);
                        const done = items.filter(i => i.concluido).length;
                        const total4 = items.length;
                        const isExpanded = expandidoId === r.id;
                        const prazoVencido = r.prazoFinalizacao && r.prazoFinalizacao < hoje && !r.conferido;

                        return (
                          <div key={r.id} className={r.conferido ? "opacity-60" : ""}>
                            {/* Linha do cliente */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              {/* Checkbox conferido */}
                              <button
                                onClick={() => toggleConferido(r)}
                                disabled={conferindoId === r.id}
                                title="Marcar como conferido"
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                  r.conferido
                                    ? "bg-emerald-400 border-emerald-400"
                                    : "border-gray-600 hover:border-orange-400"
                                }`}
                              >
                                {r.conferido && <Check className="w-3 h-3 text-gray-900" />}
                              </button>

                              {/* Info do cliente */}
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${r.conferido ? "line-through text-gray-500" : "text-gray-100"}`}>
                                  {r.nomeCliente}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-gray-500 truncate">{r.operador.nome}</p>
                                  {/* Progress pills */}
                                  <div className="flex items-center gap-1">
                                    {items.map(i => (
                                      <span key={i.key} className={`w-2 h-2 rounded-full ${i.concluido ? "bg-emerald-400" : "bg-[#232a3b]"}`} />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500">{done}/{total4}</span>
                                </div>
                              </div>

                              {/* Prazo */}
                              <div className="text-right flex-shrink-0 mr-1">
                                {r.prazoFinalizacao && !r.conferido && (
                                  <div className={`flex items-center gap-1 text-xs font-medium ${prazoVencido ? "text-red-400" : "text-orange-300"}`}>
                                    <Clock className="w-3 h-3" />
                                    {prazoVencido ? "Atrasado" : formatDate(r.prazoFinalizacao)}
                                  </div>
                                )}
                                {r.conferido && r.dataConferido && (
                                  <p className="text-xs text-emerald-400">✓ {formatDate(r.dataConferido)}</p>
                                )}
                              </div>

                              {/* Expand */}
                              <button
                                onClick={() => setExpandidoId(isExpanded ? null : r.id)}
                                className="text-gray-400 hover:text-gray-200 flex-shrink-0"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* Checklist expandido */}
                            {isExpanded && (
                              <div className="px-12 pb-3 space-y-2 bg-[#141820] border-t border-[#232a3b]">
                                <p className="text-xs text-gray-500 pt-3 pb-1 uppercase tracking-wider">Etapas</p>
                                {items.map((item) => (
                                  <button
                                    key={item.key}
                                    onClick={() => toggleChecklistItem(r, item.key)}
                                    className="w-full flex items-center gap-3 py-1.5 group"
                                  >
                                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                      item.concluido
                                        ? "bg-emerald-400 border-emerald-400"
                                        : "border-gray-600 group-hover:border-orange-400"
                                    }`}>
                                      {item.concluido && <Check className="w-3 h-3 text-gray-900" />}
                                    </span>
                                    <span className={`text-sm ${item.concluido ? "line-through text-gray-500" : "text-gray-200"}`}>
                                      {item.label}
                                    </span>
                                    {item.concluido && (
                                      <span className="ml-auto text-xs text-emerald-400">✅</span>
                                    )}
                                  </button>
                                ))}
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
          })()}

          {/* ── ABA LISTA OPERACIONAL ── */}
          {abaAtiva === "operacional" && <>

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

          {/* Filtro de periodo */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <span className="text-xs text-gray-500 self-center mr-1">Período:</span>
            {([["todos", "Todos"], ["semana", "Esta Semana"], ["mes", "Este Mês"]] as const).map(([key, label]) => (
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
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFiltroEtapa(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !filtroEtapa
                  ? "bg-orange-400 text-gray-900"
                  : "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Todos ({registrosPeriodo.length})
            </button>
            {ETAPAS_POS_VENDA.map((et) => {
              const count = contadores[et.key] ?? 0;
              const cores = ETAPA_CORES[et.key];
              return (
                <button
                  key={et.key}
                  onClick={() => setFiltroEtapa(et.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroEtapa === et.key
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

          {/* Alerta vencidos */}
          {vencidos > 0 && (
            <div className="flex items-center gap-3 bg-rose-400/10 border border-rose-400/30 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">
                <span className="font-semibold">{vencidos}</span> cliente{vencidos > 1 ? "s" : ""} com próximo contato vencido
              </p>
            </div>
          )}

          {/* Cards */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">Carregando clientes...</div>
          ) : sorted.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-[#1a1f2e] rounded-xl border border-[#232a3b]">
              Nenhum cliente encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((r) => {
                const isEditing = editingId === r.id;
                const vencido = r.proximoContato && r.proximoContato < hoje;
                const cores = ETAPA_CORES[r.etapa] || ETAPA_CORES["TRAMITES"];

                return (
                  <div key={r.id}>
                    {/* Card view */}
                    {!isEditing && (
                      <div className={`bg-[#1a1f2e] border-2 rounded-xl p-5 transition ${
                        vencido
                          ? "border-rose-500/50 shadow-lg shadow-rose-500/10"
                          : "border-[#232a3b] hover:border-[#2a3040]"
                      }`}>
                        {/* Cabeçalho */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-100">{r.nomeCliente}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              {r.telefone && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                  <Phone className="w-3.5 h-3.5" />
                                  {r.telefone}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <User className="w-3 h-3" />
                                {r.operador?.nome}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cores.bg} ${cores.text}`}>
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
                          <div className="space-y-3">
                            {r.ultimaAcao && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Última ação</p>
                                <p className="text-sm text-gray-300">{r.ultimaAcao}</p>
                              </div>
                            )}
                            {r.ultimoContato && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Último contato</p>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  {formatDate(r.ultimoContato)}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            {r.proximaAcao && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Próxima ação</p>
                                <p className="text-sm text-orange-300 font-medium">{r.proximaAcao}</p>
                              </div>
                            )}
                            {r.proximoContato && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Próximo contato</p>
                                <div className={`flex items-center gap-2 text-sm font-bold ${vencido ? "text-rose-400" : "text-emerald-400"}`}>
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(r.proximoContato)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {r.observacoes && (
                          <div className="mb-4 p-3 bg-[#141820] rounded-lg border border-[#232a3b]">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Observações</p>
                            <p className="text-sm text-gray-300">{r.observacoes}</p>
                          </div>
                        )}

                        {/* Botões */}
                        <div className="flex flex-wrap gap-2">
                          {r.etapa !== "CLIENTE_FINALIZADO" && r.etapa !== "MANUTENCOES" && trocandoEtapaId !== r.id && (
                            <button
                              onClick={() => handleAvancar(r)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-400/10 text-orange-400 text-sm font-semibold rounded-lg border border-orange-400/30 hover:bg-orange-400/20 transition"
                            >
                              <ChevronRight className="w-4 h-4" />
                              Avançar para {getEtapaLabel(getProximaEtapa(r.etapa as EtapaPosVenda) ?? "")}
                            </button>
                          )}

                          {/* Troca rápida */}
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
                        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2">
                          Editando: {r.nomeCliente}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nome</label>
                            <input
                              value={editForm.nomeCliente}
                              onChange={(e) => setEditForm((p) => ({ ...p, nomeCliente: e.target.value }))}
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                            <input
                              value={editForm.telefone}
                              onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Etapa</label>
                            <select
                              value={editForm.etapa}
                              onChange={(e) => setEditForm((p) => ({ ...p, etapa: e.target.value }))}
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
                              value={editForm.ultimaAcao}
                              onChange={(e) => setEditForm((p) => ({ ...p, ultimaAcao: e.target.value }))}
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Próxima Ação</label>
                            <input
                              value={editForm.proximaAcao}
                              onChange={(e) => setEditForm((p) => ({ ...p, proximaAcao: e.target.value }))}
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Observações</label>
                            <input
                              value={editForm.observacoes}
                              onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))}
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Último Contato</label>
                            <input
                              type="date"
                              value={editForm.ultimoContato}
                              onChange={(e) => setEditForm((p) => ({ ...p, ultimoContato: e.target.value }))}
                              className="w-full bg-[#0b0f19] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-orange-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Próximo Contato</label>
                            <input
                              type="date"
                              value={editForm.proximoContato}
                              onChange={(e) => setEditForm((p) => ({ ...p, proximoContato: e.target.value }))}
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
          </>}
        </div>
      </main>
    </div>
  );
}

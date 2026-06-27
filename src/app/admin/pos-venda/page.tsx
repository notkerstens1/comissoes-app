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
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Operação · Pós-Venda"
        title="Visão Pós Venda"
        subtitle={`${clientesFiltrados.length} cliente${clientesFiltrados.length !== 1 ? "s" : ""}${filtroEtapa ? ` em "${getEtapaLabel(filtroEtapa as EtapaPosVenda)}"` : ""}`}
        actions={
          <div className="flex items-center gap-1.5 text-liv-faint text-sm">
            <ClipboardCheck className="w-4 h-4 text-liv-orange" />
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-liv-surface border border-liv-line rounded-xl p-1 w-fit">
        <button
          onClick={() => setAbaAtiva("supervisao")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            abaAtiva === "supervisao"
              ? "bg-liv-orange text-liv-bg"
              : "text-liv-muted hover:text-liv-ink"
          }`}
        >
          Visão Supervisão
        </button>
        <button
          onClick={() => setAbaAtiva("operacional")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            abaAtiva === "operacional"
              ? "bg-liv-orange text-liv-bg"
              : "text-liv-muted hover:text-liv-ink"
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
              <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
                <p className="text-xs text-liv-faint uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-liv-ink tabular-nums mt-1">{total}</p>
                <p className="text-xs text-liv-faint mt-1">clientes ativos</p>
              </div>
              <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
                <p className="text-xs text-liv-faint uppercase tracking-wider">Conferidos</p>
                <p className="text-2xl font-bold text-liv-sage tabular-nums mt-1">{conferidos}</p>
                <p className="text-xs text-liv-faint mt-1">{total > 0 ? Math.round(conferidos / total * 100) : 0}% do total</p>
              </div>
              <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
                <p className="text-xs text-liv-faint uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-bold text-liv-gold tabular-nums mt-1">{pendentes}</p>
                <p className="text-xs text-liv-faint mt-1">aguardando revisão</p>
              </div>
              <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
                <p className="text-xs text-liv-faint uppercase tracking-wider">Atrasados</p>
                <p className="text-2xl font-bold text-liv-danger tabular-nums mt-1">{atrasados}</p>
                <p className="text-xs text-liv-faint mt-1">prazo vencido</p>
              </div>
            </div>

            {/* Lista de acompanhamento */}
            <div className="bg-liv-surface rounded-xl border border-liv-line overflow-hidden">
              <div className="px-4 py-3 border-b border-liv-line flex items-center justify-between">
                <p className="font-medium text-liv-ink text-sm">Acompanhamento por Cliente</p>
                <p className="text-xs text-liv-faint tabular-nums">{conferidos}/{total} concluídos</p>
              </div>
              {loading ? (
                <div className="px-4 py-8 text-center text-liv-faint text-sm">Carregando...</div>
              ) : registros.length === 0 ? (
                <div className="px-4 py-8 text-center text-liv-faint text-sm">Nenhum cliente cadastrado</div>
              ) : (
                <div className="divide-y divide-liv-line">
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
                                ? "bg-liv-sage border-liv-sage"
                                : "border-liv-line hover:border-liv-orange"
                            }`}
                          >
                            {r.conferido && <Check className="w-3 h-3 text-liv-bg" />}
                          </button>

                          {/* Info do cliente */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${r.conferido ? "line-through text-liv-faint" : "text-liv-ink"}`}>
                              {r.nomeCliente}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-liv-faint truncate">{r.operador.nome}</p>
                              {/* Progress pills */}
                              <div className="flex items-center gap-1">
                                {items.map(i => (
                                  <span key={i.key} className={`w-2 h-2 rounded-full ${i.concluido ? "bg-liv-sage" : "bg-liv-line"}`} />
                                ))}
                              </div>
                              <span className="text-xs text-liv-faint tabular-nums">{done}/{total4}</span>
                            </div>
                          </div>

                          {/* Prazo */}
                          <div className="text-right flex-shrink-0 mr-1">
                            {r.prazoFinalizacao && !r.conferido && (
                              <div className={`flex items-center gap-1 text-xs font-medium ${prazoVencido ? "text-liv-danger" : "text-liv-orange"}`}>
                                <Clock className="w-3 h-3" />
                                {prazoVencido ? "Atrasado" : formatDate(r.prazoFinalizacao)}
                              </div>
                            )}
                            {r.conferido && r.dataConferido && (
                              <p className="text-xs text-liv-sage">✓ {formatDate(r.dataConferido)}</p>
                            )}
                          </div>

                          {/* Expand */}
                          <button
                            onClick={() => setExpandidoId(isExpanded ? null : r.id)}
                            className="text-liv-muted hover:text-liv-ink flex-shrink-0"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Checklist expandido */}
                        {isExpanded && (
                          <div className="px-12 pb-3 space-y-2 bg-liv-bg border-t border-liv-line">
                            <p className="text-xs text-liv-faint pt-3 pb-1 uppercase tracking-wider">Etapas</p>
                            {items.map((item) => (
                              <button
                                key={item.key}
                                onClick={() => toggleChecklistItem(r, item.key)}
                                className="w-full flex items-center gap-3 py-1.5 group"
                              >
                                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                                  item.concluido
                                    ? "bg-liv-sage border-liv-sage"
                                    : "border-liv-line group-hover:border-liv-orange"
                                }`}>
                                  {item.concluido && <Check className="w-3 h-3 text-liv-bg" />}
                                </span>
                                <span className={`text-sm ${item.concluido ? "line-through text-liv-faint" : "text-liv-muted"}`}>
                                  {item.label}
                                </span>
                                {item.concluido && (
                                  <span className="ml-auto text-xs text-liv-sage">✅</span>
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
        <div className="mb-4 flex items-center gap-3 bg-liv-danger/10 border border-liv-danger/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-liv-danger shrink-0" />
          <p className="text-sm text-liv-danger">{erroMsg}</p>
          <button onClick={() => setErroMsg("")} className="ml-auto text-liv-danger hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtro de periodo */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <span className="text-xs text-liv-faint self-center mr-1">Período:</span>
        {([["todos", "Todos"], ["semana", "Esta Semana"], ["mes", "Este Mês"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFiltroPeriodo(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filtroPeriodo === key
                ? "bg-liv-info text-liv-bg"
                : "bg-liv-surface-2 text-liv-muted hover:text-liv-ink"
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
              ? "bg-liv-orange text-liv-bg"
              : "bg-liv-surface-2 text-liv-muted hover:text-liv-ink"
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
                    ? "bg-liv-surface-2 text-liv-muted hover:text-liv-ink"
                    : "bg-liv-bg text-liv-faint cursor-pointer hover:bg-liv-surface"
              }`}
            >
              {et.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Alerta vencidos */}
      {vencidos > 0 && (
        <div className="flex items-center gap-3 bg-liv-danger/10 border border-liv-danger/30 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-liv-danger shrink-0" />
          <p className="text-sm text-liv-danger">
            <span className="font-semibold tabular-nums">{vencidos}</span> cliente{vencidos > 1 ? "s" : ""} com próximo contato vencido
          </p>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-liv-faint py-12 bg-liv-surface rounded-xl border border-liv-line">
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
                  <div className={`bg-liv-surface border-2 rounded-xl p-5 transition ${
                    vencido
                      ? "border-liv-danger/50 shadow-lg shadow-liv-danger/10"
                      : "border-liv-line hover:border-liv-surface-2"
                  }`}>
                    {/* Cabeçalho */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-liv-ink">{r.nomeCliente}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {r.telefone && (
                            <div className="flex items-center gap-1.5 text-sm text-liv-muted">
                              <Phone className="w-3.5 h-3.5" />
                              {r.telefone}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-liv-faint">
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
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-liv-danger/10 text-liv-danger border border-liv-danger/30">
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
                            <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Última ação</p>
                            <p className="text-sm text-liv-muted">{r.ultimaAcao}</p>
                          </div>
                        )}
                        {r.ultimoContato && (
                          <div>
                            <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Último contato</p>
                            <div className="flex items-center gap-2 text-sm text-liv-muted">
                              <Calendar className="w-4 h-4 text-liv-faint" />
                              {formatDate(r.ultimoContato)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {r.proximaAcao && (
                          <div>
                            <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Próxima ação</p>
                            <p className="text-sm text-liv-orange font-medium">{r.proximaAcao}</p>
                          </div>
                        )}
                        {r.proximoContato && (
                          <div>
                            <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Próximo contato</p>
                            <div className={`flex items-center gap-2 text-sm font-bold ${vencido ? "text-liv-danger" : "text-liv-sage"}`}>
                              <Calendar className="w-4 h-4" />
                              {formatDate(r.proximoContato)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {r.observacoes && (
                      <div className="mb-4 p-3 bg-liv-bg rounded-lg border border-liv-line">
                        <p className="text-xs text-liv-faint font-semibold uppercase mb-1">Observações</p>
                        <p className="text-sm text-liv-muted">{r.observacoes}</p>
                      </div>
                    )}

                    {/* Botões */}
                    <div className="flex flex-wrap gap-2">
                      {r.etapa !== "CLIENTE_FINALIZADO" && r.etapa !== "MANUTENCOES" && trocandoEtapaId !== r.id && (
                        <button
                          onClick={() => handleAvancar(r)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-liv-orange/10 text-liv-orange text-sm font-semibold rounded-lg border border-liv-orange/30 hover:bg-liv-orange/20 transition"
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
                            className="flex-1 bg-liv-bg border border-liv-orange/50 rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                          >
                            {ETAPAS_POS_VENDA.map((et) => (
                              <option key={et.key} value={et.key}>{et.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => salvarTrocaEtapa(r.id)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-2 bg-liv-orange text-liv-bg rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {saving ? "..." : "Salvar"}
                          </button>
                          <button
                            onClick={() => setTrocandoEtapaId(null)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-liv-surface-2 text-liv-muted rounded-lg text-sm font-medium hover:text-liv-ink transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarTrocaEtapa(r)}
                          className="flex items-center gap-2 px-4 py-2.5 text-liv-info bg-liv-info/10 rounded-lg hover:bg-liv-info/20 border border-liv-info/30 transition text-sm font-semibold"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Alterar Etapa
                        </button>
                      )}

                      {trocandoEtapaId !== r.id && (
                        <button
                          onClick={() => startEdit(r)}
                          className="flex items-center gap-2 px-4 py-2.5 text-liv-muted bg-liv-surface-2 rounded-lg hover:text-liv-ink transition text-sm font-semibold"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>
                      )}

                      {trocandoEtapaId !== r.id && (
                        <button
                          onClick={() => handleRemover(r.id)}
                          className="flex items-center gap-2 px-4 py-2.5 text-liv-danger bg-liv-danger/10 rounded-lg hover:bg-liv-danger/20 border border-liv-danger/20 transition text-sm font-semibold"
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
                  <div className="bg-liv-surface border border-liv-orange/30 rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-liv-orange uppercase tracking-wider mb-2">
                      Editando: {r.nomeCliente}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Nome</label>
                        <input
                          value={editForm.nomeCliente}
                          onChange={(e) => setEditForm((p) => ({ ...p, nomeCliente: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Telefone</label>
                        <input
                          value={editForm.telefone}
                          onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Etapa</label>
                        <select
                          value={editForm.etapa}
                          onChange={(e) => setEditForm((p) => ({ ...p, etapa: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        >
                          {ETAPAS_POS_VENDA.map((et) => (
                            <option key={et.key} value={et.key}>{et.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Última Ação</label>
                        <input
                          value={editForm.ultimaAcao}
                          onChange={(e) => setEditForm((p) => ({ ...p, ultimaAcao: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Próxima Ação</label>
                        <input
                          value={editForm.proximaAcao}
                          onChange={(e) => setEditForm((p) => ({ ...p, proximaAcao: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Observações</label>
                        <input
                          value={editForm.observacoes}
                          onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Último Contato</label>
                        <input
                          type="date"
                          value={editForm.ultimoContato}
                          onChange={(e) => setEditForm((p) => ({ ...p, ultimoContato: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-liv-faint mb-1">Próximo Contato</label>
                        <input
                          type="date"
                          value={editForm.proximoContato}
                          onChange={(e) => setEditForm((p) => ({ ...p, proximoContato: e.target.value }))}
                          className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-orange outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(r.id)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-liv-orange text-liv-bg rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                      >
                        <Check className="w-4 h-4" />
                        {saving ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-liv-surface-2 text-liv-muted rounded-lg text-sm font-medium hover:text-liv-ink transition"
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
  );
}

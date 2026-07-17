"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Target,
  ChevronUp,
  Check,
  X,
  Pencil,
  AlertTriangle,
  Trash2,
  RotateCcw,
  ShoppingCart,
  CalendarDays,
  Eye,
  Paperclip,
  FileText,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  StickyNote,
  Save,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { isAdmin as checkAdmin } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentoAnexado } from "@/components/DocumentoAnexado";

const ESTAGIOS = [
  { key: "REUNIAO", label: "Reuniao", cor: "bg-liv-info/12 text-liv-info" },
  { key: "PROPOSTA", label: "Proposta", cor: "bg-liv-gold/12 text-liv-gold" },
  { key: "NEGOCIACAO", label: "Negociacao", cor: "bg-liv-orange/12 text-liv-orange" },
  { key: "FECHADA", label: "Fechada", cor: "bg-liv-sage/12 text-liv-sage" },
];

const MOTIVOS_FINALIZACAO = [
  "CPF negada",
  "Sem capacidade financeira",
  "Sumiu / Sem retorno",
  "So queria preco",
  "Sem interesse",
  "Fechou com concorrente",
  "Fora da regiao",
  "Desistiu",
  "Outro",
];

type PeriodoFiltro = "todos" | "esta_semana" | "semana_passada" | "este_mes" | "mes_passado";

function getDateRange(periodo: PeriodoFiltro): { startDate: string; endDate: string } | null {
  if (periodo === "todos") return null;
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  const d = hoje.getDate();
  const dow = hoje.getDay(); // 0=dom

  const fmt = (dt: Date) => dt.toISOString().split("T")[0];

  if (periodo === "esta_semana") {
    const seg = new Date(y, m, d - (dow === 0 ? 6 : dow - 1));
    const dom = new Date(seg);
    dom.setDate(seg.getDate() + 6);
    return { startDate: fmt(seg), endDate: fmt(dom) };
  }
  if (periodo === "semana_passada") {
    const segAtual = new Date(y, m, d - (dow === 0 ? 6 : dow - 1));
    const segPassada = new Date(segAtual);
    segPassada.setDate(segAtual.getDate() - 7);
    const domPassado = new Date(segPassada);
    domPassado.setDate(segPassada.getDate() + 6);
    return { startDate: fmt(segPassada), endDate: fmt(domPassado) };
  }
  if (periodo === "este_mes") {
    const inicio = new Date(y, m, 1);
    const fim = new Date(y, m + 1, 0);
    return { startDate: fmt(inicio), endDate: fmt(fim) };
  }
  if (periodo === "mes_passado") {
    const inicio = new Date(y, m - 1, 1);
    const fim = new Date(y, m, 0);
    return { startDate: fmt(inicio), endDate: fmt(fim) };
  }
  return null;
}

type Registro = {
  id: string;
  nomeCliente: string;
  dataReuniao: string;
  statusLead: string;
  valorForecast: number | null;
  estagioOportunidade: string;
  probabilidade: number;
  dataFechamentoEsperado: string | null;
  motivoFinalizacao: string | null;
  sdr: { id: string; nome: string };
  vendedora: { id: string; nome: string };
  compareceu: boolean;
  // "SDR" (prospeccao da SDR) | "VENDEDOR" (auto-prospeccao do proprio vendedor)
  origemRegistro?: string;
  // Campos SDR visíveis ao vendedor
  consideracoes: string | null;
  temImagem: boolean;
  motivoNaoCompareceu: string | null;
  // Nota do supervisor (apenas admin/diretor)
  notaAdmin?: string | null;
};

type EditState = {
  valorForecast: string;
  estagioOportunidade: string;
  probabilidade: string;
  dataFechamentoEsperado: string;
  descartado: boolean;
  motivoDescarte: string;
};

export default function OportunidadesPage() {
  const { data: session } = useSession();
  const admin = checkAdmin(session?.user?.role);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [totalForecast, setTotalForecast] = useState(0);
  const [totalPonderado, setTotalPonderado] = useState(0);
  const [alertas5dias, setAlertas5dias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "descartados">("pipeline");

  // Filtro por vendedor (admin/diretor)
  const [vendedorFiltro, setVendedorFiltro] = useState("");
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);

  // Filtro por periodo
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");

  // Filtro por estagio
  const [estagioFiltro, setEstagioFiltro] = useState("todos");

  // Edicao inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditState>({
    valorForecast: "",
    estagioOportunidade: "REUNIAO",
    probabilidade: "50",
    dataFechamentoEsperado: "",
    descartado: false,
    motivoDescarte: "",
  });
  const [saving, setSaving] = useState(false);

  // Detalhes SDR expandível
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // Modal de descarte
  const [descartando, setDescartando] = useState<string | null>(null);
  const [motivoDescarte, setMotivoDescarte] = useState("");

  // Modal de Nova Oportunidade (auto-prospeccao do vendedor)
  const [novaOportunidade, setNovaOportunidade] = useState(false);
  const [novaForm, setNovaForm] = useState({
    nomeCliente: "",
    telefone: "",
    dataReuniao: new Date().toISOString().split("T")[0],
    valorForecast: "",
    consideracoes: "",
  });
  const [salvandoNova, setSalvandoNova] = useState(false);
  const [erroNova, setErroNova] = useState("");

  // Modal de fechar venda
  const [fechandoVenda, setFechandoVenda] = useState<Registro | null>(null);
  const [vendaForm, setVendaForm] = useState({
    valorVenda: "",
    custoEquipamentos: "",
    formaPagamento: "",
    distribuidora: "",
    kwp: "",
    quantidadePlacas: "",
    fonte: "",
    tipoVenda: "INBOUND" as "INBOUND" | "EXTERNA",
    // Margem de instalacao (engenharia/Pedro)
    metragemCaboPrevista: "",
    bitolaCabo: "6mm" as "6mm" | "10mm",
    inversorTrifasico: false,
    cidadeInstalacao: "",
  });
  const isHibrido = session?.user?.role === "VENDEDOR_HIBRIDO";
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const [erroVenda, setErroVenda] = useState("");

  // PDF do orcamento
  const [orcamentoPdf, setOrcamentoPdf] = useState<string | null>(null);
  const [orcamentoNome, setOrcamentoNome] = useState("");

  // Notas do supervisor (admin/diretor)
  const [editingNotaId, setEditingNotaId] = useState<string | null>(null);
  const [notaAdminText, setNotaAdminText] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);

  const handleOrcamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setErroVenda("PDF muito grande. Maximo 15MB.");
      return;
    }
    setOrcamentoNome(file.name);
    const reader = new FileReader();
    reader.onload = () => setOrcamentoPdf(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Carregar vendedores para admin
  useEffect(() => {
    if (admin) {
      fetch("/api/admin/vendedores")
        .then((r) => r.json())
        .then((data) => {
          const v = data
            .filter((u: any) => u.ativo && (u.role === "VENDEDOR" || u.role === "VENDEDOR_EXTERNO" || u.role === "VENDEDOR_HIBRIDO"))
            .map((u: any) => ({ id: u.id, nome: u.nome }));
          setVendedores(v);
        })
        .catch(console.error);
    }
  }, [admin]);

  const fetchOportunidades = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/vendedor/oportunidades?tab=${tab}`;
      if (vendedorFiltro) url += `&vendedor=${vendedorFiltro}`;
      const range = getDateRange(periodo);
      if (range) {
        url += `&startDate=${range.startDate}&endDate=${range.endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setRegistros(data.registros ?? []);
      setTotalForecast(data.totalForecast ?? 0);
      setTotalPonderado(data.totalPonderado ?? 0);
      setAlertas5dias(data.alertas5dias ?? 0);
    } finally {
      setLoading(false);
    }
  }, [tab, vendedorFiltro, periodo]);

  useEffect(() => {
    fetchOportunidades();
  }, [fetchOportunidades]);

  // Calcular dias no pipe
  const getDiasNoPipe = (dataReuniao: string) => {
    const hoje = new Date();
    const reuniao = new Date(dataReuniao);
    return Math.floor((hoje.getTime() - reuniao.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDiasBadge = (dias: number) => {
    if (dias >= 5) return "bg-liv-danger/12 text-liv-danger";
    if (dias >= 3) return "bg-liv-gold/12 text-liv-gold";
    return "bg-liv-sage/12 text-liv-sage";
  };

  // Edicao
  function startEdit(r: Registro) {
    setEditingId(r.id);
    setEditData({
      valorForecast: r.valorForecast != null ? String(r.valorForecast) : "",
      estagioOportunidade: r.estagioOportunidade,
      probabilidade: String(r.probabilidade),
      dataFechamentoEsperado: r.dataFechamentoEsperado ?? "",
      descartado: false,
      motivoDescarte: "",
    });
  }

  async function saveEdit(id: string) {
    if (editData.descartado && !editData.motivoDescarte) return;
    setSaving(true);
    try {
      if (editData.descartado) {
        // Descartar via edit
        await fetch("/api/vendedor/oportunidades", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registroId: id,
            statusLead: "FINALIZADO",
            motivoFinalizacao: editData.motivoDescarte,
          }),
        });
      } else {
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
      }
      setEditingId(null);
      await fetchOportunidades();
    } finally {
      setSaving(false);
    }
  }

  // Descartar lead
  async function descartarLead() {
    if (!descartando || !motivoDescarte) return;
    setSaving(true);
    try {
      await fetch("/api/vendedor/oportunidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registroId: descartando,
          statusLead: "FINALIZADO",
          motivoFinalizacao: motivoDescarte,
        }),
      });
      setDescartando(null);
      setMotivoDescarte("");
      await fetchOportunidades();
    } finally {
      setSaving(false);
    }
  }

  // Reativar lead
  async function reativarLead(id: string) {
    setSaving(true);
    try {
      await fetch("/api/vendedor/oportunidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registroId: id,
          statusLead: "COMPARECEU",
        }),
      });
      await fetchOportunidades();
    } finally {
      setSaving(false);
    }
  }

  // Fechar Venda
  async function fecharVenda() {
    if (!fechandoVenda) return;
    setErroVenda("");
    setSalvandoVenda(true);
    try {
      const payload = {
        cliente: fechandoVenda.nomeCliente,
        // ID da oportunidade => backend fecha ESTE registro de forma deterministica
        // (nao depende do matching fuzzy, que deixava a oportunidade duplicada).
        registroSDRId: fechandoVenda.id,
        valorVenda: parseFloat(vendaForm.valorVenda),
        custoEquipamentos: parseFloat(vendaForm.custoEquipamentos),
        formaPagamento: vendaForm.formaPagamento,
        distribuidora: vendaForm.distribuidora,
        kwp: parseFloat(vendaForm.kwp) || 0,
        quantidadePlacas: parseInt(vendaForm.quantidadePlacas) || 0,
        fonte: vendaForm.fonte,
        dataConversao: new Date().toISOString().split("T")[0],
        orcamentoUrl: orcamentoPdf || null,
        ...(isHibrido ? { tipoVenda: vendaForm.tipoVenda } : {}),
        // Margem de instalacao (so envia se vendedor preencheu metragem)
        ...(vendaForm.metragemCaboPrevista ? {
          metragemCaboPrevista: parseInt(vendaForm.metragemCaboPrevista),
          bitolaCabo: vendaForm.bitolaCabo,
          inversorTrifasico: vendaForm.inversorTrifasico,
          cidadeInstalacao: vendaForm.cidadeInstalacao.trim() || undefined,
        } : {}),
      };

      if (!payload.valorVenda || !payload.custoEquipamentos) {
        throw new Error("Valor da venda e custo de equipamentos sao obrigatorios");
      }

      // 1. Criar a venda (POST /api/vendas vai auto-vincular SDR)
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar venda");
      }

      // 2. Oportunidade sai do pipeline automaticamente via tentarVincularVendaSDR
      setFechandoVenda(null);
      setVendaForm({
        valorVenda: "",
        custoEquipamentos: "",
        formaPagamento: "",
        distribuidora: "",
        kwp: "",
        quantidadePlacas: "",
        fonte: "",
        tipoVenda: "INBOUND",
        metragemCaboPrevista: "",
        bitolaCabo: "6mm",
        inversorTrifasico: false,
        cidadeInstalacao: "",
      });
      setOrcamentoPdf(null);
      setOrcamentoNome("");
      await fetchOportunidades();
    } catch (error: any) {
      setErroVenda(error.message || "Erro ao criar venda");
    }
    setSalvandoVenda(false);
  }

  // Criar nova oportunidade (auto-prospeccao do vendedor)
  async function criarNovaOportunidade() {
    if (!novaForm.nomeCliente.trim() || !novaForm.dataReuniao) {
      setErroNova("Nome do cliente e data do agendamento sao obrigatorios");
      return;
    }
    if (!novaForm.telefone.trim()) {
      setErroNova("Telefone do cliente é obrigatório (com DDD)");
      return;
    }
    setErroNova("");
    setSalvandoNova(true);
    try {
      const res = await fetch("/api/vendedor/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: novaForm.nomeCliente,
          telefone: novaForm.telefone,
          dataReuniao: novaForm.dataReuniao,
          valorForecast: novaForm.valorForecast || null,
          consideracoes: novaForm.consideracoes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar oportunidade");
      }
      setNovaOportunidade(false);
      setNovaForm({
        nomeCliente: "",
        telefone: "",
        dataReuniao: new Date().toISOString().split("T")[0],
        valorForecast: "",
        consideracoes: "",
      });
      await fetchOportunidades();
    } catch (error: any) {
      setErroNova(error.message || "Erro ao criar oportunidade");
    } finally {
      setSalvandoNova(false);
    }
  }

  // Salvar nota do supervisor
  async function salvarNotaAdmin(registroId: string) {
    setSalvandoNota(true);
    try {
      await fetch("/api/vendedor/oportunidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registroId,
          notaAdmin: notaAdminText,
        }),
      });
      setEditingNotaId(null);
      await fetchOportunidades();
    } finally {
      setSalvandoNota(false);
    }
  }

  function getEstagioStyle(key: string) {
    return ESTAGIOS.find((e) => e.key === key)?.cor ?? "bg-liv-faint/12 text-liv-faint";
  }
  function getEstagioLabel(key: string) {
    return ESTAGIOS.find((e) => e.key === key)?.label ?? key;
  }

  function formatDate(d: string | null) {
    if (!d) return "--";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  const hoje = new Date().toISOString().split("T")[0];

  // Aplicar filtro por estagio (client-side)
  const registrosFiltrados = estagioFiltro === "todos"
    ? registros
    : registros.filter((r) => r.estagioOportunidade === estagioFiltro);

  return (
    <div className="space-y-6">

          {/* Modal de Descarte */}
          {descartando && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-liv-surface rounded-2xl max-w-sm w-full shadow-lg border border-liv-line">
                <div className="p-5 border-b border-liv-line">
                  <h3 className="font-bold text-liv-ink">Descartar Lead</h3>
                </div>
                <div className="p-5 space-y-4">
                  <select
                    value={motivoDescarte}
                    onChange={(e) => setMotivoDescarte(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                  >
                    <option value="">Selecione o motivo...</option>
                    {MOTIVOS_FINALIZACAO.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="p-5 border-t border-liv-line flex gap-3">
                  <button onClick={() => { setDescartando(null); setMotivoDescarte(""); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition text-sm">
                    Cancelar
                  </button>
                  <button onClick={descartarLead} disabled={!motivoDescarte || saving}
                    className="flex-1 px-4 py-2 rounded-lg bg-liv-danger text-liv-bg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Nova Oportunidade (auto-prospeccao do vendedor) */}
          {novaOportunidade && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-liv-surface rounded-2xl max-w-md w-full shadow-lg border border-liv-line">
                <div className="p-5 border-b border-liv-line">
                  <h3 className="font-bold text-liv-ink flex items-center gap-2">
                    <Target className="w-5 h-5 text-liv-sage" />
                    Nova Oportunidade
                  </h3>
                  <p className="text-xs text-liv-faint mt-1">
                    Cliente que voce mesmo prospectou e agendou. Entra no seu pipeline e
                    conta na sua eficiencia.
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-liv-muted mb-1">Nome do Cliente *</label>
                    <input
                      type="text"
                      value={novaForm.nomeCliente}
                      onChange={(e) => setNovaForm({ ...novaForm, nomeCliente: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                      placeholder="Nome completo do cliente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-liv-muted mb-1">Telefone (WhatsApp) *</label>
                    <input
                      type="tel"
                      value={novaForm.telefone}
                      onChange={(e) => setNovaForm({ ...novaForm, telefone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                      placeholder="(84) 9 9999-9999"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Data do Agendamento *</label>
                      <input
                        type="date"
                        value={novaForm.dataReuniao}
                        onChange={(e) => setNovaForm({ ...novaForm, dataReuniao: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Valor Estimado (R$)</label>
                      <input
                        type="number"
                        value={novaForm.valorForecast}
                        onChange={(e) => setNovaForm({ ...novaForm, valorForecast: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                        placeholder="Ex: 45000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-liv-muted mb-1">Observacoes</label>
                    <textarea
                      value={novaForm.consideracoes}
                      onChange={(e) => setNovaForm({ ...novaForm, consideracoes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm resize-none focus:border-liv-sage outline-none"
                      placeholder="Contexto do contato, qualificacao, proximo passo..."
                    />
                  </div>
                  {erroNova && (
                    <div className="bg-liv-danger/10 text-liv-danger px-4 py-2 rounded-lg text-sm">{erroNova}</div>
                  )}
                </div>
                <div className="p-5 border-t border-liv-line flex gap-3">
                  <button onClick={() => { setNovaOportunidade(false); setErroNova(""); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition text-sm">
                    Cancelar
                  </button>
                  <button onClick={criarNovaOportunidade} disabled={salvandoNova}
                    className="flex-1 px-4 py-2 rounded-lg bg-liv-sage text-liv-bg text-sm font-medium hover:bg-liv-sage-deep transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {salvandoNova ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg" />
                    ) : (
                      <><Plus className="w-4 h-4" /> Criar Oportunidade</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Fechar Venda */}
          {fechandoVenda && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-liv-surface rounded-2xl max-w-lg w-full shadow-lg border border-liv-line max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-liv-line">
                  <h3 className="font-bold text-liv-ink flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-liv-sage" />
                    Fechar Venda — {fechandoVenda.nomeCliente}
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Valor da Venda (R$) *</label>
                      <input type="number" value={vendaForm.valorVenda}
                        onChange={(e) => setVendaForm({ ...vendaForm, valorVenda: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                        placeholder="Ex: 45000" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Custo Equipamentos (R$) *</label>
                      <input type="number" value={vendaForm.custoEquipamentos}
                        onChange={(e) => setVendaForm({ ...vendaForm, custoEquipamentos: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                        placeholder="Ex: 25000" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Forma de Pagamento</label>
                      <select value={vendaForm.formaPagamento}
                        onChange={(e) => setVendaForm({ ...vendaForm, formaPagamento: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none">
                        <option value="">Selecione...</option>
                        <option value="SANTANDER">Santander</option>
                        <option value="BV">BV</option>
                        <option value="SOLFACIL">Solfacil</option>
                        <option value="SOL_AGORA">Sol Agora</option>
                        <option value="TVIN">TVIN</option>
                        <option value="A_VISTA">A Vista</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Distribuidora</label>
                      <select value={vendaForm.distribuidora}
                        onChange={(e) => setVendaForm({ ...vendaForm, distribuidora: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none">
                        <option value="">Selecione...</option>
                        <option value="BELENERGY">Belenergy</option>
                        <option value="SOLFACIL">Solfacil</option>
                        <option value="BLUESUN">Bluesun</option>
                        <option value="SOL_AGORA">Sol Agora</option>
                        <option value="TVIN">TVIN</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">kWp</label>
                      <input type="number" step="0.01" value={vendaForm.kwp}
                        onChange={(e) => setVendaForm({ ...vendaForm, kwp: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                        placeholder="5.40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Qtd. Placas</label>
                      <input type="number" value={vendaForm.quantidadePlacas}
                        onChange={(e) => setVendaForm({ ...vendaForm, quantidadePlacas: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                        placeholder="8" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-muted mb-1">Fonte</label>
                      <select value={vendaForm.fonte}
                        onChange={(e) => setVendaForm({ ...vendaForm, fonte: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none">
                        <option value="">Selecione...</option>
                        <option value="TRAFEGO">Trafego</option>
                        <option value="INDICACAO">Indicacao</option>
                        <option value="FOLLOWUP">Followup (lead do trafego, sem SDR)</option>
                      </select>
                    </div>
                  </div>

                  {/* Origem da venda (apenas vendedor hibrido) */}
                  {isHibrido && (
                    <div className="rounded-lg border border-liv-sage/40 bg-liv-surface-2 p-3">
                      <label className="block text-xs font-medium text-liv-muted mb-2">
                        Origem da venda <span className="text-liv-sage">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setVendaForm({ ...vendaForm, tipoVenda: "INBOUND" })}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                            vendaForm.tipoVenda === "INBOUND"
                              ? "border-liv-sage bg-liv-sage/15 text-liv-sage"
                              : "border-liv-line bg-transparent text-liv-muted hover:text-liv-ink"
                          }`}
                        >
                          Inbound
                          <span className="block text-[10px] font-normal text-liv-faint mt-0.5">
                            Lead da empresa · over progressivo
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVendaForm({ ...vendaForm, tipoVenda: "EXTERNA" })}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                            vendaForm.tipoVenda === "EXTERNA"
                              ? "border-liv-sage bg-liv-sage/15 text-liv-sage"
                              : "border-liv-line bg-transparent text-liv-muted hover:text-liv-ink"
                          }`}
                        >
                          Externa
                          <span className="block text-[10px] font-normal text-liv-faint mt-0.5">
                            Captação própria · over 50% flat
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Margem de instalacao — engenharia. So admin/diretor veem
                      aqui; vendedor nao mexe em cabos/bitola/cidade (Pedro
                      cuida disso em /tecnico/margem depois da venda). */}
                  {admin && (
                  <div className="rounded-lg border border-liv-teal/30 bg-liv-teal/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-liv-teal">
                        Engenharia · ajuda Pedro a precificar instalacao
                      </label>
                      <span className="text-[10px] text-liv-faint">opcional, mas evita prejuizo</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-liv-muted mb-0.5">Metragem cabo (m/perna)</label>
                        <input
                          type="number"
                          value={vendaForm.metragemCaboPrevista}
                          onChange={(e) => setVendaForm({ ...vendaForm, metragemCaboPrevista: e.target.value })}
                          placeholder="ex: 15"
                          className="w-full px-2 py-1.5 rounded border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:ring-1 focus:ring-liv-teal outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-liv-muted mb-0.5">Bitola do cabo</label>
                        <select
                          value={vendaForm.bitolaCabo}
                          onChange={(e) => setVendaForm({ ...vendaForm, bitolaCabo: e.target.value as "6mm" | "10mm" })}
                          className="w-full px-2 py-1.5 rounded border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:border-liv-sage outline-none"
                        >
                          <option value="6mm">6mm</option>
                          <option value="10mm">10mm</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-liv-muted mb-0.5">Cidade da instalacao</label>
                        <input
                          type="text"
                          value={vendaForm.cidadeInstalacao}
                          onChange={(e) => setVendaForm({ ...vendaForm, cidadeInstalacao: e.target.value })}
                          placeholder="ex: Natal"
                          className="w-full px-2 py-1.5 rounded border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:ring-1 focus:ring-liv-teal outline-none"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs text-liv-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vendaForm.inversorTrifasico}
                            onChange={(e) => setVendaForm({ ...vendaForm, inversorTrifasico: e.target.checked })}
                            className="rounded border-liv-line"
                          />
                          Inversor trifasico
                        </label>
                      </div>
                    </div>

                    {/* Avisos contextuais (Bloco 1.4) */}
                    {vendaForm.metragemCaboPrevista && parseInt(vendaForm.metragemCaboPrevista) > 20 && (
                      <div className="text-xs bg-liv-danger/10 border border-liv-danger/30 rounded px-2 py-1.5 text-liv-danger">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Mais de 20m por perna. Negocie material extra com o cliente OU peça aprovação do diretor pra absorver.
                      </div>
                    )}
                    {vendaForm.metragemCaboPrevista &&
                      parseInt(vendaForm.metragemCaboPrevista) > 15 &&
                      parseInt(vendaForm.metragemCaboPrevista) <= 20 && (
                      <div className="text-xs bg-liv-gold/10 border border-liv-gold/30 rounded px-2 py-1.5 text-liv-gold">
                        Acima do padrao (15m), mas dentro da tolerancia (20m).
                      </div>
                    )}
                    {vendaForm.inversorTrifasico && (
                      <div className="text-xs bg-liv-info/10 border border-liv-info/30 rounded px-2 py-1.5 text-liv-info">
                        Trifasico = 4 cabos por perna. Avise o Pedro antes de fechar pra ele preparar material.
                      </div>
                    )}
                    {vendaForm.cidadeInstalacao &&
                      !["natal", "parnamirim", "macaiba"].includes(vendaForm.cidadeInstalacao.trim().toLowerCase()) && (
                      <div className="text-xs bg-liv-violet/10 border border-liv-violet/30 rounded px-2 py-1.5 text-liv-violet">
                        Cidade fora da regiao metropolitana. Deslocamento e material podem encarecer — confirme com Pedro.
                      </div>
                    )}
                  </div>
                  )}

                  {/* Upload do Orcamento PDF */}
                  <div>
                    <label className="block text-xs font-medium text-liv-muted mb-1">
                      <Paperclip className="w-3 h-3 inline mr-1" />
                      Orcamento (PDF)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleOrcamentoChange}
                        className="hidden"
                        id="orcamento-upload"
                      />
                      <label
                        htmlFor="orcamento-upload"
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-liv-line bg-liv-surface-2 text-liv-muted text-sm cursor-pointer hover:border-liv-sage/50 hover:text-liv-sage transition"
                      >
                        <Upload className="w-4 h-4" />
                        {orcamentoNome ? (
                          <span className="text-liv-sage truncate">{orcamentoNome}</span>
                        ) : (
                          <span>Clique para anexar PDF do orcamento</span>
                        )}
                      </label>
                      {orcamentoPdf && (
                        <button
                          type="button"
                          onClick={() => { setOrcamentoPdf(null); setOrcamentoNome(""); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-liv-danger/10 text-liv-faint hover:text-liv-danger transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-liv-faint mt-1">Maximo 15MB. Visivel para financeiro, admin e diretoria.</p>
                  </div>

                  {erroVenda && (
                    <div className="bg-liv-danger/10 text-liv-danger px-4 py-2 rounded-lg text-sm">{erroVenda}</div>
                  )}
                </div>
                <div className="p-5 border-t border-liv-line flex gap-3">
                  <button onClick={() => { setFechandoVenda(null); setErroVenda(""); setOrcamentoPdf(null); setOrcamentoNome(""); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition text-sm">
                    Cancelar
                  </button>
                  <button onClick={fecharVenda} disabled={salvandoVenda}
                    className="flex-1 px-4 py-2 rounded-lg bg-liv-sage text-liv-bg text-sm font-medium hover:bg-liv-sage-deep transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {salvandoVenda ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg" />
                    ) : (
                      <><ShoppingCart className="w-4 h-4" /> Criar Venda</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <PageHeader
            eyebrow="Vendas · Pipeline"
            title="Oportunidades"
            subtitle={admin ? "Todas as oportunidades do time" : "Leads qualificados pelo SDR destinados a voce"}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                {!admin && (
                  <button
                    onClick={() => { setNovaOportunidade(true); setErroNova(""); }}
                    className="px-4 py-2 rounded-lg bg-liv-sage text-liv-bg text-sm font-medium hover:bg-liv-sage-deep transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Oportunidade
                  </button>
                )}
                {admin && vendedores.length > 0 && (
                  <select
                    value={vendedorFiltro}
                    onChange={(e) => setVendedorFiltro(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink focus:border-liv-sage outline-none"
                  >
                    <option value="">Todos os vendedores</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-1 bg-liv-surface-2 rounded-lg p-1">
                  <CalendarDays className="w-4 h-4 text-liv-faint ml-2" />
                  {([
                    { key: "todos", label: "Todos" },
                    { key: "esta_semana", label: "Semana" },
                    { key: "semana_passada", label: "Sem. Ant." },
                    { key: "este_mes", label: "Mês" },
                    { key: "mes_passado", label: "Mês Ant." },
                  ] as { key: PeriodoFiltro; label: string }[]).map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPeriodo(p.key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                        periodo === p.key
                          ? "bg-liv-sage text-liv-bg"
                          : "text-liv-muted hover:text-liv-ink"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {tab === "pipeline" && (
                  <div className="flex items-center gap-1 bg-liv-surface-2 rounded-lg p-1">
                    <Target className="w-4 h-4 text-liv-faint ml-2" />
                    {[
                      { key: "todos", label: "Todos" },
                      ...ESTAGIOS.map((e) => ({ key: e.key, label: e.label })),
                    ].map((e) => (
                      <button
                        key={e.key}
                        onClick={() => setEstagioFiltro(e.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                          estagioFiltro === e.key
                            ? "bg-liv-sage text-liv-bg"
                            : "text-liv-muted hover:text-liv-ink"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          />

          {/* Alerta 5+ dias */}
          {alertas5dias > 0 && tab === "pipeline" && (
            <div className="bg-liv-danger/10 border border-liv-danger/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-liv-danger flex-shrink-0" />
              <p className="text-sm text-liv-danger">
                <strong>{alertas5dias} oportunidade{alertas5dias > 1 ? "s" : ""}</strong> com 5+ dias sem engajamento
              </p>
            </div>
          )}

          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Oportunidades</p>
              <p className="text-3xl font-bold text-liv-sage mt-2 tabular-nums">{registrosFiltrados.length}</p>
              <p className="text-xs text-liv-faint mt-1">
                {tab === "pipeline" ? "abertas no momento" : "descartadas"}
                {estagioFiltro !== "todos" && ` (${getEstagioLabel(estagioFiltro)})`}
              </p>
            </div>
            <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Forecast Total</p>
              <p className="text-3xl font-bold text-liv-sage mt-2 tabular-nums">
                {formatCurrency(registrosFiltrados.reduce((s, r) => s + (r.valorForecast ?? 0), 0))}
              </p>
              <p className="text-xs text-liv-faint mt-1">soma dos valores estimados</p>
            </div>
            <div className="bg-liv-surface rounded-xl p-5 border border-liv-line">
              <p className="text-xs text-liv-faint uppercase tracking-wider">Forecast Ponderado</p>
              <p className="text-3xl font-bold text-liv-sage-deep mt-2 tabular-nums">
                {formatCurrency(registrosFiltrados.reduce((s, r) => s + (r.valorForecast ?? 0) * (r.probabilidade / 100), 0))}
              </p>
              <p className="text-xs text-liv-faint mt-1">valor x probabilidade</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-liv-surface-2 rounded-lg p-1 w-fit">
            <button
              onClick={() => { setTab("pipeline"); setEstagioFiltro("todos"); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === "pipeline" ? "bg-liv-sage text-liv-bg" : "text-liv-muted hover:text-liv-ink"
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => { setTab("descartados"); setEstagioFiltro("todos"); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === "descartados" ? "bg-liv-surface text-liv-ink" : "text-liv-muted hover:text-liv-ink"
              }`}
            >
              Descartados
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-liv-surface rounded-xl overflow-hidden border border-liv-line">
            {loading ? (
              <div className="p-12 text-center text-liv-muted">Carregando...</div>
            ) : registrosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-liv-muted">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>
                  {estagioFiltro !== "todos"
                    ? `Nenhuma oportunidade em "${getEstagioLabel(estagioFiltro)}"`
                    : tab === "pipeline" ? "Nenhuma oportunidade aberta" : "Nenhum lead descartado"}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs table-fixed">
                <thead>
                  <tr className="border-b border-liv-line bg-liv-surface-2">
                    {admin ? (
                      <>
                        <th className="text-left pl-3 pr-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[18%]">Cliente</th>
                        <th className="text-left px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[11%]">Vendedor</th>
                        <th className="text-left px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[10%]">Reuniao</th>
                        <th className="text-center px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[5%]">Dias</th>
                        <th className="text-right px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[12%]">Forecast</th>
                        <th className="text-center px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[11%]">Estagio</th>
                        <th className="text-center px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[6%]">Prob.</th>
                        <th className="text-left px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[11%]">
                          {tab === "descartados" ? "Motivo" : "Fecham."}
                        </th>
                        <th className="text-center px-1 pr-3 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[10%]">Acoes</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left pl-3 pr-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[22%]">Cliente</th>
                        <th className="text-left px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[12%]">Reuniao</th>
                        <th className="text-center px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[7%]">Dias</th>
                        <th className="text-right px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[14%]">Forecast</th>
                        <th className="text-center px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[12%]">Estagio</th>
                        <th className="text-center px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[7%]">Prob.</th>
                        <th className="text-left px-1 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[13%]">
                          {tab === "descartados" ? "Motivo" : "Fechamento"}
                        </th>
                        <th className="text-center px-1 pr-3 py-3 font-bold text-[11px] uppercase tracking-[0.12em] text-liv-faint w-[10%]">Acoes</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map((r) => {
                    const dias = getDiasNoPipe(r.dataReuniao);
                    const vencido = r.dataFechamentoEsperado && r.dataFechamentoEsperado < hoje;
                    const isEditing = editingId === r.id;

                    return (
                      <React.Fragment key={r.id}>
                        <tr className={`border-b border-liv-line/40 hover:bg-liv-surface-2/50 transition ${vencido ? "opacity-70" : ""}`}>
                          <td className="pl-3 pr-1 py-3 overflow-hidden">
                            <p className="font-medium text-liv-ink text-sm truncate">{r.nomeCliente}</p>
                            {r.origemRegistro === "VENDEDOR" ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-liv-sage/12 text-liv-sage font-medium">
                                Prospecção própria
                              </span>
                            ) : (
                              <p className="text-[11px] text-liv-faint mt-0.5 truncate">SDR: {r.sdr.nome}</p>
                            )}
                          </td>
                          {admin && (
                            <td className="px-1 py-3 text-liv-muted text-sm truncate overflow-hidden">{r.vendedora.nome}</td>
                          )}
                          <td className="px-1 py-3 text-liv-muted text-sm">{formatDate(r.dataReuniao)}</td>
                          <td className="px-1 py-3 text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${getDiasBadge(dias)}`}>
                              {dias}d
                            </span>
                          </td>
                          <td className="px-1 py-3 text-right">
                            {r.valorForecast != null && r.valorForecast > 0 ? (
                              <span className="text-liv-sage font-semibold text-sm tabular-nums">{formatCurrency(r.valorForecast)}</span>
                            ) : (
                              <span className="text-liv-faint">--</span>
                            )}
                          </td>
                          <td className="px-1 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getEstagioStyle(r.estagioOportunidade)}`}>
                              {getEstagioLabel(r.estagioOportunidade)}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center">
                            <span className={`text-sm font-bold tabular-nums ${r.probabilidade >= 70 ? "text-liv-sage" : r.probabilidade >= 40 ? "text-liv-gold" : "text-liv-danger"}`}>
                              {r.probabilidade}%
                            </span>
                          </td>
                          <td className="px-1 py-3">
                            {tab === "descartados" ? (
                              <span className="text-sm text-liv-muted truncate block">{r.motivoFinalizacao || "--"}</span>
                            ) : (
                              <span className={`text-sm ${vencido ? "text-liv-danger font-medium" : "text-liv-muted"}`}>
                                {formatDate(r.dataFechamentoEsperado)}
                              </span>
                            )}
                          </td>
                          <td className="px-1 pr-3 py-3">
                            <div className="flex items-center justify-center gap-0.5">
                              {tab === "pipeline" && (
                                <>
                                  <button
                                    onClick={() => setDetailsId(detailsId === r.id ? null : r.id)}
                                    className="p-1 rounded-lg hover:bg-liv-info/10 text-liv-faint hover:text-liv-info transition relative"
                                    title="Ver info SDR"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {admin && r.notaAdmin && (
                                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-liv-gold rounded-full" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => isEditing ? setEditingId(null) : startEdit(r)}
                                    className="p-1 rounded-lg hover:bg-liv-surface-2 text-liv-faint hover:text-liv-ink transition"
                                    title="Editar"
                                  >
                                    {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setFechandoVenda(r);
                                      setVendaForm({
                                        valorVenda: r.valorForecast ? String(r.valorForecast) : "",
                                        custoEquipamentos: "",
                                        formaPagamento: "",
                                        distribuidora: "",
                                        kwp: "",
                                        quantidadePlacas: "",
                                        // Oportunidade propria do vendedor = indicacao;
                                        // oportunidade da SDR = trafego. Pre-seleciona pra
                                        // o vinculo de comissao bater certo.
                                        fonte: r.origemRegistro === "VENDEDOR" ? "INDICACAO" : "TRAFEGO",
                                        tipoVenda: "INBOUND",
                                        metragemCaboPrevista: "",
                                        bitolaCabo: "6mm",
                                        inversorTrifasico: false,
                                        cidadeInstalacao: "",
                                      });
                                    }}
                                    className="p-1 rounded-lg hover:bg-liv-sage/10 text-liv-faint hover:text-liv-sage transition"
                                    title="Fechar Venda"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDescartando(r.id)}
                                    className="p-1 rounded-lg hover:bg-liv-danger/10 text-liv-faint hover:text-liv-danger transition"
                                    title="Descartar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {tab === "descartados" && (
                                <button
                                  onClick={() => reativarLead(r.id)}
                                  disabled={saving}
                                  className="px-2 py-1 rounded-lg hover:bg-liv-sage/10 text-liv-faint hover:text-liv-sage transition disabled:opacity-50 flex items-center gap-1 text-xs"
                                  title="Reativar"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reativar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* SDR Details row */}
                        {detailsId === r.id && (
                          <tr className="bg-liv-info/5 border-b border-liv-line/40">
                            <td colSpan={admin ? 9 : 8} className="px-4 py-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-liv-info">
                                  <Eye className="w-4 h-4" />
                                  Informacoes do SDR — {r.nomeCliente}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div className="bg-liv-surface-2 rounded-lg p-3">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">SDR Responsavel</p>
                                    <p className="text-sm text-liv-ink font-medium">{r.sdr.nome}</p>
                                  </div>
                                  <div className="bg-liv-surface-2 rounded-lg p-3">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">Data Reuniao</p>
                                    <p className="text-sm text-liv-ink">{formatDate(r.dataReuniao)}</p>
                                  </div>
                                  <div className="bg-liv-surface-2 rounded-lg p-3">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">Compareceu</p>
                                    <p className={`text-sm font-medium ${r.compareceu ? "text-liv-sage" : "text-liv-danger"}`}>
                                      {r.compareceu ? "Sim" : "Nao"}
                                    </p>
                                  </div>
                                  {!r.compareceu && r.motivoNaoCompareceu && (
                                    <div className="bg-liv-surface-2 rounded-lg p-3">
                                      <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1">Motivo Nao Compareceu</p>
                                      <p className="text-sm text-liv-gold">{r.motivoNaoCompareceu}</p>
                                    </div>
                                  )}
                                </div>
                                {r.consideracoes && (
                                  <div className="bg-liv-surface-2 rounded-lg p-3">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-1 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" /> Consideracoes da SDR
                                    </p>
                                    <p className="text-sm text-liv-muted whitespace-pre-wrap">{r.consideracoes}</p>
                                  </div>
                                )}
                                {r.temImagem && (
                                  <div className="bg-liv-surface-2 rounded-lg p-3">
                                    <p className="text-[11px] text-liv-faint uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" /> Documento Anexado (Conta de Luz / Documento)
                                    </p>
                                    <DocumentoAnexado registroId={r.id} />
                                  </div>
                                )}
                                {!r.consideracoes && !r.temImagem && !r.motivoNaoCompareceu && (
                                  <p className="text-xs text-liv-faint italic">Nenhuma informacao adicional registrada pela SDR.</p>
                                )}

                                {/* Notas do Supervisor — somente admin/diretor */}
                                {admin && (
                                  <div className="mt-3 bg-liv-gold/5 border border-liv-gold/20 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-[11px] text-liv-gold uppercase tracking-wider font-semibold flex items-center gap-1">
                                        <StickyNote className="w-3 h-3" /> Notas do Supervisor
                                      </p>
                                      {editingNotaId !== r.id && (
                                        <button
                                          onClick={() => {
                                            setEditingNotaId(r.id);
                                            setNotaAdminText(r.notaAdmin ?? "");
                                          }}
                                          className="text-[11px] text-liv-gold/70 hover:text-liv-gold transition flex items-center gap-1"
                                        >
                                          <Pencil className="w-3 h-3" /> Editar
                                        </button>
                                      )}
                                    </div>
                                    {editingNotaId === r.id ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={notaAdminText}
                                          onChange={(e) => setNotaAdminText(e.target.value)}
                                          placeholder="Escreva observacoes, lembretes ou notas sobre esta oportunidade..."
                                          rows={3}
                                          className="w-full bg-liv-bg border border-liv-gold/30 rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-gold outline-none resize-none placeholder:text-liv-faint"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => salvarNotaAdmin(r.id)}
                                            disabled={salvandoNota}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-liv-gold text-liv-bg rounded-lg text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                                          >
                                            <Save className="w-3 h-3" />
                                            {salvandoNota ? "Salvando..." : "Salvar Nota"}
                                          </button>
                                          <button
                                            onClick={() => setEditingNotaId(null)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-liv-surface-2 text-liv-muted rounded-lg text-xs font-medium hover:bg-liv-line transition"
                                          >
                                            <X className="w-3 h-3" /> Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : r.notaAdmin ? (
                                      <p className="text-sm text-liv-gold/80 whitespace-pre-wrap">{r.notaAdmin}</p>
                                    ) : (
                                      <p className="text-xs text-liv-faint italic">Nenhuma nota adicionada.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Inline edit row */}
                        {isEditing && (
                          <tr className="bg-liv-surface-2 border-b border-liv-line/40">
                            <td colSpan={admin ? 9 : 8} className="px-3 py-4">
                              {/* Toggle descartado */}
                              <div className="mb-3">
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={editData.descartado}
                                    onChange={(e) => setEditData((p) => ({ ...p, descartado: e.target.checked, motivoDescarte: "" }))}
                                    className="w-4 h-4 rounded border-liv-line bg-liv-bg text-liv-danger focus:ring-liv-danger"
                                  />
                                  <span className={`text-sm font-medium ${editData.descartado ? "text-liv-danger" : "text-liv-muted"}`}>
                                    Marcar como Descartado
                                  </span>
                                </label>
                              </div>

                              {editData.descartado ? (
                                /* Motivo do descarte */
                                <div className="bg-liv-danger/5 border border-liv-danger/20 rounded-lg p-4">
                                  <label className="block text-xs text-liv-danger font-medium mb-2">Motivo do descarte</label>
                                  <select
                                    value={editData.motivoDescarte}
                                    onChange={(e) => setEditData((p) => ({ ...p, motivoDescarte: e.target.value }))}
                                    className="w-full bg-liv-bg border border-liv-danger/30 rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-danger outline-none"
                                  >
                                    <option value="">Selecione o motivo...</option>
                                    {MOTIVOS_FINALIZACAO.map((m) => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                /* Campos normais de edicao */
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-xs text-liv-faint mb-1">Valor Forecast (R$)</label>
                                    <input
                                      type="number"
                                      value={editData.valorForecast}
                                      onChange={(e) => setEditData((p) => ({ ...p, valorForecast: e.target.value }))}
                                      className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                      placeholder="Ex: 45000"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-liv-faint mb-1">Estagio</label>
                                    <select
                                      value={editData.estagioOportunidade}
                                      onChange={(e) => setEditData((p) => ({ ...p, estagioOportunidade: e.target.value }))}
                                      className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                    >
                                      {ESTAGIOS.map((e) => (
                                        <option key={e.key} value={e.key}>{e.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-liv-faint mb-1">Probabilidade (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editData.probabilidade}
                                      onChange={(e) => setEditData((p) => ({ ...p, probabilidade: e.target.value }))}
                                      className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-liv-faint mb-1">Data Fechamento</label>
                                    <input
                                      type="date"
                                      value={editData.dataFechamentoEsperado}
                                      onChange={(e) => setEditData((p) => ({ ...p, dataFechamentoEsperado: e.target.value }))}
                                      className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => saveEdit(r.id)}
                                  disabled={saving || (editData.descartado && !editData.motivoDescarte)}
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition ${
                                    editData.descartado
                                      ? "bg-liv-danger text-liv-bg hover:opacity-90"
                                      : "bg-liv-sage text-liv-bg hover:bg-liv-sage-deep"
                                  }`}
                                >
                                  {editData.descartado ? (
                                    <><Trash2 className="w-3.5 h-3.5" /> {saving ? "Descartando..." : "Descartar"}</>
                                  ) : (
                                    <><Check className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar"}</>
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-liv-surface-2 text-liv-muted rounded-lg text-sm font-medium hover:bg-liv-line transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
    </div>
  );
}

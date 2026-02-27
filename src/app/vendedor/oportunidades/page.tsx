"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { formatCurrency } from "@/lib/utils";
import { isAdmin as checkAdmin } from "@/lib/roles";

const ESTAGIOS = [
  { key: "REUNIAO", label: "Reuniao", cor: "bg-sky-400/10 text-sky-400" },
  { key: "PROPOSTA", label: "Proposta", cor: "bg-amber-400/10 text-amber-400" },
  { key: "NEGOCIACAO", label: "Negociacao", cor: "bg-orange-400/10 text-orange-400" },
  { key: "FECHADA", label: "Fechada", cor: "bg-emerald-400/10 text-emerald-400" },
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
};

type EditState = {
  valorForecast: string;
  estagioOportunidade: string;
  probabilidade: string;
  dataFechamentoEsperado: string;
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

  // Edicao inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditState>({
    valorForecast: "",
    estagioOportunidade: "REUNIAO",
    probabilidade: "50",
    dataFechamentoEsperado: "",
  });
  const [saving, setSaving] = useState(false);

  // Modal de descarte
  const [descartando, setDescartando] = useState<string | null>(null);
  const [motivoDescarte, setMotivoDescarte] = useState("");

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
  });
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const [erroVenda, setErroVenda] = useState("");

  // Carregar vendedores para admin
  useEffect(() => {
    if (admin) {
      fetch("/api/admin/vendedores")
        .then((r) => r.json())
        .then((data) => {
          const v = data
            .filter((u: any) => u.ativo && (u.role === "VENDEDOR" || u.role === "ADMIN" || u.role === "DIRETOR"))
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
      const res = await fetch(url);
      const data = await res.json();
      setRegistros(data.registros ?? []);
      setTotalForecast(data.totalForecast ?? 0);
      setTotalPonderado(data.totalPonderado ?? 0);
      setAlertas5dias(data.alertas5dias ?? 0);
    } finally {
      setLoading(false);
    }
  }, [tab, vendedorFiltro]);

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
    if (dias >= 5) return "bg-red-400/10 text-red-400";
    if (dias >= 3) return "bg-amber-400/10 text-amber-400";
    return "bg-lime-400/10 text-lime-400";
  };

  // Edicao
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
        valorVenda: parseFloat(vendaForm.valorVenda),
        custoEquipamentos: parseFloat(vendaForm.custoEquipamentos),
        formaPagamento: vendaForm.formaPagamento,
        distribuidora: vendaForm.distribuidora,
        kwp: parseFloat(vendaForm.kwp) || 0,
        quantidadePlacas: parseInt(vendaForm.quantidadePlacas) || 0,
        fonte: vendaForm.fonte,
        dataConversao: new Date().toISOString().split("T")[0],
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
      });
      await fetchOportunidades();
    } catch (error: any) {
      setErroVenda(error.message || "Erro ao criar venda");
    }
    setSalvandoVenda(false);
  }

  function getEstagioStyle(key: string) {
    return ESTAGIOS.find((e) => e.key === key)?.cor ?? "bg-gray-400/10 text-gray-400";
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

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto">

          {/* Modal de Descarte */}
          {descartando && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-[#1a1f2e] rounded-2xl max-w-sm w-full shadow-lg">
                <div className="p-5 border-b border-[#232a3b]">
                  <h3 className="font-bold text-gray-100">Descartar Lead</h3>
                </div>
                <div className="p-5 space-y-4">
                  <select
                    value={motivoDescarte}
                    onChange={(e) => setMotivoDescarte(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                  >
                    <option value="">Selecione o motivo...</option>
                    {MOTIVOS_FINALIZACAO.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="p-5 border-t border-[#232a3b] flex gap-3">
                  <button onClick={() => { setDescartando(null); setMotivoDescarte(""); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#232a3b] text-gray-400 hover:bg-[#232a3b] transition text-sm">
                    Cancelar
                  </button>
                  <button onClick={descartarLead} disabled={!motivoDescarte || saving}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50">
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Fechar Venda */}
          {fechandoVenda && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-[#1a1f2e] rounded-2xl max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-[#232a3b]">
                  <h3 className="font-bold text-gray-100 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-lime-400" />
                    Fechar Venda — {fechandoVenda.nomeCliente}
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Valor da Venda (R$) *</label>
                      <input type="number" value={vendaForm.valorVenda}
                        onChange={(e) => setVendaForm({ ...vendaForm, valorVenda: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                        placeholder="Ex: 45000" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Custo Equipamentos (R$) *</label>
                      <input type="number" value={vendaForm.custoEquipamentos}
                        onChange={(e) => setVendaForm({ ...vendaForm, custoEquipamentos: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                        placeholder="Ex: 25000" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Forma de Pagamento</label>
                      <select value={vendaForm.formaPagamento}
                        onChange={(e) => setVendaForm({ ...vendaForm, formaPagamento: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm">
                        <option value="">Selecione...</option>
                        <option value="SANTANDER">Santander</option>
                        <option value="BV">BV</option>
                        <option value="SOLFACIL">Solfacil</option>
                        <option value="A_VISTA">A Vista</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Distribuidora</label>
                      <select value={vendaForm.distribuidora}
                        onChange={(e) => setVendaForm({ ...vendaForm, distribuidora: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm">
                        <option value="">Selecione...</option>
                        <option value="BELENERGY">Belenergy</option>
                        <option value="SOLFACIL">Solfacil</option>
                        <option value="BLUESUN">Bluesun</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">kWp</label>
                      <input type="number" step="0.01" value={vendaForm.kwp}
                        onChange={(e) => setVendaForm({ ...vendaForm, kwp: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                        placeholder="5.40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Qtd. Placas</label>
                      <input type="number" value={vendaForm.quantidadePlacas}
                        onChange={(e) => setVendaForm({ ...vendaForm, quantidadePlacas: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                        placeholder="8" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Fonte</label>
                      <select value={vendaForm.fonte}
                        onChange={(e) => setVendaForm({ ...vendaForm, fonte: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm">
                        <option value="">Selecione...</option>
                        <option value="TRAFEGO">Trafego</option>
                        <option value="INDICACAO">Indicacao</option>
                      </select>
                    </div>
                  </div>

                  {erroVenda && (
                    <div className="bg-red-400/10 text-red-400 px-4 py-2 rounded-lg text-sm">{erroVenda}</div>
                  )}
                </div>
                <div className="p-5 border-t border-[#232a3b] flex gap-3">
                  <button onClick={() => { setFechandoVenda(null); setErroVenda(""); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#232a3b] text-gray-400 hover:bg-[#232a3b] transition text-sm">
                    Cancelar
                  </button>
                  <button onClick={fecharVenda} disabled={salvandoVenda}
                    className="flex-1 px-4 py-2 rounded-lg bg-lime-400 text-gray-900 text-sm font-medium hover:bg-lime-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {salvandoVenda ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
                    ) : (
                      <><ShoppingCart className="w-4 h-4" /> Criar Venda</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <Target className="w-6 h-6 text-lime-400" />
                Oportunidades
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {admin ? "Todas as oportunidades do time" : "Leads qualificados pelo SDR destinados a voce"}
              </p>
            </div>
            {admin && vendedores.length > 0 && (
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Alerta 5+ dias */}
          {alertas5dias > 0 && tab === "pipeline" && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">
                <strong>{alertas5dias} oportunidade{alertas5dias > 1 ? "s" : ""}</strong> com 5+ dias sem engajamento
              </p>
            </div>
          )}

          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Oportunidades</p>
              <p className="text-2xl font-bold text-lime-400">{registros.length}</p>
              <p className="text-xs text-gray-500 mt-1">{tab === "pipeline" ? "abertas no momento" : "descartadas"}</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Forecast Total</p>
              <p className="text-2xl font-bold text-lime-400">{formatCurrency(totalForecast)}</p>
              <p className="text-xs text-gray-500 mt-1">soma dos valores estimados</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Forecast Ponderado</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPonderado)}</p>
              <p className="text-xs text-gray-500 mt-1">valor x probabilidade</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-[#141820] rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab("pipeline")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === "pipeline" ? "bg-lime-400 text-gray-900" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setTab("descartados")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                tab === "descartados" ? "bg-gray-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Descartados
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : registros.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{tab === "pipeline" ? "Nenhuma oportunidade aberta" : "Nenhum lead descartado"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#232a3b] bg-[#141820]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                      {admin && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reuniao</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dias</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Forecast</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estagio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prob.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {tab === "descartados" ? "Motivo" : "Fechamento"}
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232a3b]">
                    {registros.map((r) => {
                      const dias = getDiasNoPipe(r.dataReuniao);
                      const vencido = r.dataFechamentoEsperado && r.dataFechamentoEsperado < hoje;
                      const isEditing = editingId === r.id;

                      return (
                        <tbody key={r.id}>
                          <tr className={`hover:bg-[#141820] transition ${vencido ? "opacity-75" : ""}`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-100">{r.nomeCliente}</p>
                              <p className="text-xs text-gray-500">SDR: {r.sdr.nome}</p>
                            </td>
                            {admin && (
                              <td className="px-4 py-3 text-gray-300 text-xs">{r.vendedora.nome}</td>
                            )}
                            <td className="px-4 py-3 text-gray-300">{formatDate(r.dataReuniao)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDiasBadge(dias)}`}>
                                {dias}d
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {r.valorForecast != null ? (
                                <span className="text-lime-400 font-medium">{formatCurrency(r.valorForecast)}</span>
                              ) : (
                                <span className="text-gray-600 italic text-xs">--</span>
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
                              {tab === "descartados" ? (
                                <span className="text-xs text-gray-400">{r.motivoFinalizacao || "--"}</span>
                              ) : (
                                <span className={vencido ? "text-rose-400 text-xs font-medium" : "text-gray-300 text-xs"}>
                                  {formatDate(r.dataFechamentoEsperado)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {tab === "pipeline" && (
                                  <>
                                    <button
                                      onClick={() => isEditing ? setEditingId(null) : startEdit(r)}
                                      className="p-1.5 rounded-lg hover:bg-[#232a3b] text-gray-400 hover:text-gray-100 transition"
                                      title="Editar"
                                    >
                                      {isEditing ? <ChevronUp className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
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
                                          fonte: "",
                                        });
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-lime-400/10 text-gray-400 hover:text-lime-400 transition"
                                      title="Fechar Venda"
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDescartando(r.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-400/10 text-gray-400 hover:text-red-400 transition"
                                      title="Descartar"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {tab === "descartados" && (
                                  <button
                                    onClick={() => reativarLead(r.id)}
                                    disabled={saving}
                                    className="p-1.5 rounded-lg hover:bg-lime-400/10 text-gray-400 hover:text-lime-400 transition disabled:opacity-50 flex items-center gap-1 text-xs"
                                    title="Reativar"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Inline edit row */}
                          {isEditing && (
                            <tr className="bg-[#141820]">
                              <td colSpan={admin ? 9 : 8} className="px-4 py-4">
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
                                    <label className="block text-xs text-gray-500 mb-1">Estagio</label>
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
                        </tbody>
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

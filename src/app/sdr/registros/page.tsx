"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Save,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Link2,
  Pencil,
  ClipboardList,
  Calendar,
  User,
  MessageSquare,
  DollarSign,
  Clock,
  Lock,
  Ban,
  ShoppingCart,
  CalendarClock,
} from "lucide-react";
import { MOTIVOS_NAO_COMPARECEU, MOTIVOS_FINALIZACAO, COLUNAS_KANBAN } from "@/lib/sdr";
import type { StatusLead } from "@/lib/sdr";

interface Vendedora {
  id: string;
  nome: string;
}

interface Registro {
  id: string;
  sdrId: string;
  dataRegistro: string;
  nomeCliente: string;
  vendedoraId: string;
  vendedora: { nome: string };
  dataReuniao: string;
  compareceu: boolean;
  motivoNaoCompareceu: string | null;
  motivoFinalizacao: string | null;
  consideracoes: string | null;
  vendaVinculadaId: string | null;
  vendaVinculada: {
    id: string;
    cliente: string;
    valorVenda: number;
    dataConversao: string;
  } | null;
  comissaoReuniao: number;
  comissaoVenda: number;
  comissaoTotal: number;
  statusPagamento: string;
  statusLead: StatusLead;
}

// Cores por coluna
const colunaConfig: Record<string, { border: string; bg: string; text: string; badge: string; icon: React.ReactNode; count: string }> = {
  AGENDADO: {
    border: "border-amber-400/30",
    bg: "bg-amber-400/5",
    text: "text-amber-400",
    badge: "bg-amber-400/15 text-amber-400",
    icon: <CalendarClock className="w-4 h-4" />,
    count: "bg-amber-400/20 text-amber-400",
  },
  COMPARECEU: {
    border: "border-sky-400/30",
    bg: "bg-sky-400/5",
    text: "text-sky-400",
    badge: "bg-sky-400/15 text-sky-400",
    icon: <CheckCircle className="w-4 h-4" />,
    count: "bg-sky-400/20 text-sky-400",
  },
  FINALIZADO: {
    border: "border-gray-500/30",
    bg: "bg-gray-500/5",
    text: "text-gray-400",
    badge: "bg-gray-500/15 text-gray-400",
    icon: <Ban className="w-4 h-4" />,
    count: "bg-gray-500/20 text-gray-400",
  },
};

export default function RegistrosSDRPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Form accordion
  const [formAberto, setFormAberto] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formErro, setFormErro] = useState("");
  const [formSucesso, setFormSucesso] = useState(false);
  const formContentRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState(0);

  // Form fields
  const [nomeCliente, setNomeCliente] = useState("");
  const [vendedoraId, setVendedoraId] = useState("");
  const [dataReuniao, setDataReuniao] = useState(new Date().toISOString().split("T")[0]);
  const [compareceu, setCompareceu] = useState(false);
  const [motivoNaoCompareceu, setMotivoNaoCompareceu] = useState("");
  const [consideracoes, setConsideracoes] = useState("");

  // Card editing
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    dataReuniao: "",
    compareceu: false,
    motivoNaoCompareceu: "",
    consideracoes: "",
    statusLead: "AGENDADO" as StatusLead,
    motivoFinalizacao: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  // Detail modal
  const [detalheRegistro, setDetalheRegistro] = useState<Registro | null>(null);

  // Finalizar modal
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [motivoFinal, setMotivoFinal] = useState("");
  const [finalizandoLoading, setFinalizandoLoading] = useState(false);

  useEffect(() => {
    fetchVendedoras();
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [mesAtual]);

  useEffect(() => {
    if (formContentRef.current) {
      const observer = new ResizeObserver(() => {
        if (formContentRef.current) {
          setFormHeight(formContentRef.current.scrollHeight);
        }
      });
      observer.observe(formContentRef.current);
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (formContentRef.current) {
      setFormHeight(formContentRef.current.scrollHeight);
    }
  }, [formAberto, compareceu, formErro, formSucesso]);

  const fetchVendedoras = async () => {
    try {
      const res = await fetch("/api/sdr/vendedores");
      const data = await res.json();
      setVendedoras(data);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sdr/registros?mes=${mesAtual}`);
      const data = await res.json();
      setRegistros(data);
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setNomeCliente("");
    setVendedoraId("");
    setDataReuniao(new Date().toISOString().split("T")[0]);
    setCompareceu(false);
    setMotivoNaoCompareceu("");
    setConsideracoes("");
    setFormErro("");
    setFormSucesso(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/sdr/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente,
          vendedoraId,
          dataReuniao,
          compareceu,
          motivoNaoCompareceu: compareceu ? null : motivoNaoCompareceu,
          consideracoes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      setFormSucesso(true);
      setTimeout(() => {
        resetForm();
        setFormAberto(false);
        fetchRegistros();
      }, 1200);
    } catch (error: any) {
      setFormErro(error.message);
    }
    setFormLoading(false);
  };

  const excluirRegistro = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      const res = await fetch(`/api/sdr/registros/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao excluir");
        return;
      }
      fetchRegistros();
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const iniciarEdicao = (r: Registro, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoId(r.id);
    setEditData({
      dataReuniao: r.dataReuniao,
      compareceu: r.compareceu,
      motivoNaoCompareceu: r.motivoNaoCompareceu || "",
      consideracoes: r.consideracoes || "",
      statusLead: r.statusLead,
      motivoFinalizacao: r.motivoFinalizacao || "",
    });
  };

  const salvarEdicao = async (id: string, temVinculo: boolean) => {
    setEditLoading(true);
    try {
      const body: any = {
        consideracoes: editData.consideracoes,
        statusLead: editData.statusLead,
        motivoFinalizacao: editData.statusLead === "FINALIZADO" ? editData.motivoFinalizacao : null,
      };

      if (!temVinculo) {
        body.dataReuniao = editData.dataReuniao;
        body.compareceu = editData.compareceu;
        body.motivoNaoCompareceu = editData.compareceu ? null : editData.motivoNaoCompareceu;
      }

      const res = await fetch(`/api/sdr/registros/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao salvar");
        return;
      }
      setEditandoId(null);
      fetchRegistros();
    } catch (error) {
      console.error("Erro:", error);
    }
    setEditLoading(false);
  };

  const finalizarLead = async () => {
    if (!finalizandoId || !motivoFinal) return;
    setFinalizandoLoading(true);
    try {
      const res = await fetch(`/api/sdr/registros/${finalizandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusLead: "FINALIZADO", motivoFinalizacao: motivoFinal }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao finalizar");
        return;
      }
      setFinalizandoId(null);
      setMotivoFinal("");
      fetchRegistros();
    } catch (error) {
      console.error("Erro:", error);
    }
    setFinalizandoLoading(false);
  };

  const marcarCompareceu = async (id: string) => {
    try {
      const res = await fetch(`/api/sdr/registros/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compareceu: true, statusLead: "COMPARECEU" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro");
        return;
      }
      fetchRegistros();
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const cancelarEdicao = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoId(null);
  };

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-sky-400/30 focus:border-transparent outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";

  // Agrupar registros por coluna — VENDIDO fica dentro de COMPARECEU
  const getRegistrosPorColuna = (colunaKey: string) => {
    if (colunaKey === "COMPARECEU") {
      return registros.filter((r) => r.statusLead === "COMPARECEU" || r.statusLead === "VENDIDO");
    }
    return registros.filter((r) => r.statusLead === colunaKey);
  };

  return (
    <div className="space-y-6">
      {/* MODAL DETALHE */}
      {detalheRegistro && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetalheRegistro(null)}>
          <div
            className="bg-[#1a1f2e] rounded-2xl max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#232a3b]">
              <div>
                <h3 className="font-bold text-lg text-gray-100">{detalheRegistro.nomeCliente}</h3>
                <p className="text-sm text-gray-400 mt-0.5">Registro completo do lead</p>
              </div>
              <button onClick={() => setDetalheRegistro(null)} className="text-gray-500 hover:text-gray-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#141820] rounded-lg p-4 border border-[#232a3b]">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Vendedora</p>
                  </div>
                  <p className="text-sm font-medium text-gray-100">{detalheRegistro.vendedora.nome}</p>
                </div>
                <div className="bg-[#141820] rounded-lg p-4 border border-[#232a3b]">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Data da Reuniao</p>
                  </div>
                  <p className="text-sm font-medium text-gray-100">
                    {new Date(detalheRegistro.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="bg-[#141820] rounded-lg p-4 border border-[#232a3b]">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Data do Registro</p>
                  </div>
                  <p className="text-sm font-medium text-gray-100">
                    {new Date(detalheRegistro.dataRegistro + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="bg-[#141820] rounded-lg p-4 border border-[#232a3b]">
                  <div className="flex items-center gap-2 mb-1">
                    {detalheRegistro.compareceu ? (
                      <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <p className="text-xs text-gray-500">Compareceu</p>
                  </div>
                  <p className={`text-sm font-medium ${detalheRegistro.compareceu ? "text-sky-400" : "text-red-400"}`}>
                    {detalheRegistro.compareceu ? "Sim" : "Nao"}
                  </p>
                  {!detalheRegistro.compareceu && detalheRegistro.motivoNaoCompareceu && (
                    <p className="text-xs text-red-400/70 mt-0.5">{detalheRegistro.motivoNaoCompareceu}</p>
                  )}
                </div>
              </div>

              {detalheRegistro.statusLead === "FINALIZADO" && detalheRegistro.motivoFinalizacao && (
                <div className="bg-red-400/5 rounded-lg p-4 border border-red-400/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Ban className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-xs text-red-400">Motivo da Finalizacao</p>
                  </div>
                  <p className="text-sm font-medium text-red-300">{detalheRegistro.motivoFinalizacao}</p>
                </div>
              )}

              {detalheRegistro.consideracoes && (
                <div className="bg-[#141820] rounded-lg p-4 border border-[#232a3b]">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Consideracoes</p>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{detalheRegistro.consideracoes}</p>
                </div>
              )}

              <div className="bg-sky-400/5 rounded-lg p-4 border border-sky-400/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-sky-400" />
                  <p className="text-sm font-medium text-sky-400">Comissoes</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Reuniao</span>
                    <span className={`text-sm font-medium ${detalheRegistro.comissaoReuniao > 0 ? "text-sky-400" : "text-gray-500"}`}>
                      {formatCurrency(detalheRegistro.comissaoReuniao)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Venda vinculada</span>
                    <span className={`text-sm font-medium ${detalheRegistro.comissaoVenda > 0 ? "text-sky-400" : "text-gray-500"}`}>
                      {formatCurrency(detalheRegistro.comissaoVenda)}
                    </span>
                  </div>
                  <div className="border-t border-sky-400/20 pt-2 flex justify-between">
                    <span className="text-sm font-semibold text-gray-100">Total</span>
                    <span className="text-sm font-bold text-sky-400">{formatCurrency(detalheRegistro.comissaoTotal)}</span>
                  </div>
                </div>
              </div>

              {detalheRegistro.vendaVinculada && (
                <div className="bg-[#141820] rounded-lg p-4 border border-sky-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-xs font-medium text-sky-400">Venda Vinculada</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Cliente</span>
                      <span className="text-sm text-gray-100">{detalheRegistro.vendaVinculada.cliente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Valor</span>
                      <span className="text-sm font-medium text-sky-400">{formatCurrency(detalheRegistro.vendaVinculada.valorVenda)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Data conversao</span>
                      <span className="text-sm text-gray-100">
                        {new Date(detalheRegistro.vendaVinculada.dataConversao).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-[#141820] rounded-lg px-4 py-3 border border-[#232a3b]">
                <span className="text-sm text-gray-400">Status do Pagamento</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  detalheRegistro.statusPagamento === "PAGO"
                    ? "bg-sky-400/15 text-sky-400"
                    : "bg-amber-400/15 text-amber-400"
                }`}>
                  {detalheRegistro.statusPagamento}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR */}
      {finalizandoId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setFinalizandoId(null); setMotivoFinal(""); }}>
          <div
            className="bg-[#1a1f2e] rounded-2xl max-w-sm w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#232a3b]">
              <h3 className="font-bold text-gray-100">Finalizar Lead</h3>
              <p className="text-sm text-gray-400 mt-1">Selecione o motivo da finalizacao</p>
            </div>
            <div className="p-6 space-y-4">
              <select
                value={motivoFinal}
                onChange={(e) => setMotivoFinal(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione o motivo...</option>
                {MOTIVOS_FINALIZACAO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => { setFinalizandoId(null); setMotivoFinal(""); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={finalizarLead}
                  disabled={!motivoFinal || finalizandoLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-400 transition text-sm disabled:opacity-50"
                >
                  {finalizandoLoading ? "..." : "Finalizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Meus Registros</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
          />
          <button
            onClick={() => {
              if (formAberto) resetForm();
              setFormAberto(!formAberto);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
              formAberto
                ? "bg-[#232a3b] text-gray-300 hover:bg-[#2a3142]"
                : "bg-sky-400 text-gray-900 hover:bg-sky-300"
            }`}
          >
            <Plus
              className={`w-4 h-4 transition-transform duration-300 ${formAberto ? "rotate-45" : ""}`}
            />
            Novo Registro
          </button>
        </div>
      </div>

      {/* Accordion Form */}
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: formAberto ? `${formHeight + 32}px` : "0px",
          opacity: formAberto ? 1 : 0,
        }}
      >
        <div ref={formContentRef}>
          <form
            onSubmit={handleSubmit}
            className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] space-y-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-100">Novo Registro de Reuniao</h2>
              <button
                type="button"
                onClick={() => { resetForm(); setFormAberto(false); }}
                className="text-gray-500 hover:text-gray-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome do Cliente *</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className={inputClass}
                  placeholder="Nome completo do lead"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Vendedora *</label>
                <select
                  value={vendedoraId}
                  onChange={(e) => setVendedoraId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Selecione...</option>
                  {vendedoras.map((v) => (
                    <option key={v.id} value={v.id}>{v.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data da Reuniao *</label>
                <input
                  type="date"
                  value={dataReuniao}
                  onChange={(e) => setDataReuniao(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Compareceu?</label>
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setCompareceu(true)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                      compareceu
                        ? "bg-sky-400/10 border-sky-400/30 text-sky-400"
                        : "border-[#232a3b] text-gray-400 hover:bg-[#232a3b]"
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareceu(false)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                      !compareceu
                        ? "bg-red-400/10 border-red-400/30 text-red-400"
                        : "border-[#232a3b] text-gray-400 hover:bg-[#232a3b]"
                    }`}
                  >
                    Nao
                  </button>
                </div>
              </div>
            </div>

            {!compareceu && (
              <div>
                <label className={labelClass}>Motivo do Nao Comparecimento</label>
                <select
                  value={motivoNaoCompareceu}
                  onChange={(e) => setMotivoNaoCompareceu(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {MOTIVOS_NAO_COMPARECEU.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Consideracoes</label>
              <textarea
                value={consideracoes}
                onChange={(e) => setConsideracoes(e.target.value)}
                className={`${inputClass} h-20 resize-none`}
                placeholder="Observacoes sobre a reuniao..."
              />
            </div>

            {compareceu && (
              <div className="bg-sky-400/10 border border-sky-400/20 rounded-lg px-4 py-3">
                <p className="text-sm text-sky-400">
                  Comissao por reuniao comparecida: <strong>R$ 20,00</strong>
                </p>
              </div>
            )}

            {formErro && (
              <div className="bg-red-400/10 text-red-400 px-4 py-3 rounded-lg text-sm">{formErro}</div>
            )}
            {formSucesso && (
              <div className="bg-sky-400/10 text-sky-400 px-4 py-3 rounded-lg text-sm">Registro criado com sucesso!</div>
            )}

            <button
              type="submit"
              disabled={formLoading || formSucesso}
              className="w-full bg-sky-400 text-gray-900 py-3 rounded-lg font-semibold hover:bg-sky-300 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Registro
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1f2e] rounded-xl p-4 shadow-sm border border-[#232a3b]">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-100 mt-0.5">{registros.length}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-4 shadow-sm border border-[#232a3b]">
          <p className="text-xs text-gray-500">Compareceram</p>
          <p className="text-lg font-bold text-sky-400 mt-0.5">
            {registros.filter((r) => r.compareceu).length}
          </p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-4 shadow-sm border border-[#232a3b]">
          <p className="text-xs text-gray-500">Venderam</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">
            {registros.filter((r) => r.statusLead === "VENDIDO").length}
          </p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-4 shadow-sm border border-[#232a3b]">
          <p className="text-xs text-gray-500">Comissao</p>
          <p className="text-lg font-bold text-sky-400 mt-0.5">
            {formatCurrency(registros.reduce((s, r) => s + r.comissaoTotal, 0))}
          </p>
        </div>
      </div>

      {/* KANBAN */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
        </div>
      ) : registros.length === 0 ? (
        <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
          <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhum registro neste mes</h3>
          <button
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-2 bg-sky-400 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-sky-300 transition"
          >
            <Plus className="w-4 h-4" />
            Novo Registro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {COLUNAS_KANBAN.map((coluna) => {
            const regs = getRegistrosPorColuna(coluna.key);
            const cfg = colunaConfig[coluna.key];

            return (
              <div key={coluna.key} className="space-y-3">
                {/* Header da coluna */}
                <div className={`rounded-xl p-4 border ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cfg.text}>{cfg.icon}</span>
                      <div>
                        <h3 className={`font-semibold text-sm ${cfg.text}`}>{coluna.label}</h3>
                        <p className="text-[11px] text-gray-500">{coluna.sublabel}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.count}`}>
                      {regs.length}
                    </span>
                  </div>
                </div>

                {/* Cards da coluna */}
                <div className="space-y-2">
                  {regs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#232a3b] p-6 text-center">
                      <p className="text-xs text-gray-600">Nenhum lead</p>
                    </div>
                  ) : (
                    regs.map((r) => {
                      const isEditing = editandoId === r.id;
                      const temVinculo = !!r.vendaVinculadaId;
                      const isVendido = r.statusLead === "VENDIDO";

                      return (
                        <div
                          key={r.id}
                          className={`bg-[#1a1f2e] rounded-lg border overflow-hidden transition-all ${
                            isEditing ? "border-sky-400/40" : "border-[#232a3b] hover:border-[#3a4255]"
                          }`}
                        >
                          {/* Card content — VIEW */}
                          {!isEditing && (
                            <div
                              onClick={() => setDetalheRegistro(r)}
                              className="p-3.5 cursor-pointer space-y-2"
                            >
                              {/* Header do card */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-sm text-gray-100 truncate">{r.nomeCliente}</h4>
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    {r.vendedora.nome} · {new Date(r.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => iniciarEdicao(r, e)}
                                    className="text-gray-600 hover:text-sky-400 transition p-1 rounded hover:bg-sky-400/10"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {!temVinculo && r.statusLead !== "FINALIZADO" && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); excluirRegistro(r.id, e); }}
                                      className="text-gray-600 hover:text-red-400 transition p-1 rounded hover:bg-red-400/10"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isVendido && (
                                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 font-medium">
                                    <ShoppingCart className="w-2.5 h-2.5" />
                                    Vendeu
                                  </span>
                                )}
                                {!r.compareceu && r.motivoNaoCompareceu && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">
                                    {r.motivoNaoCompareceu}
                                  </span>
                                )}
                                {r.statusLead === "FINALIZADO" && r.motivoFinalizacao && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 font-medium">
                                    {r.motivoFinalizacao}
                                  </span>
                                )}
                                {r.comissaoTotal > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-400 font-medium ml-auto">
                                    {formatCurrency(r.comissaoTotal)}
                                  </span>
                                )}
                              </div>

                              {/* Considerações */}
                              {r.consideracoes && (
                                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                                  {r.consideracoes}
                                </p>
                              )}

                              {/* Ações rápidas da coluna */}
                              {coluna.key === "AGENDADO" && (
                                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => marcarCompareceu(r.id)}
                                    className="flex-1 text-[11px] py-1.5 rounded-lg bg-sky-400/10 text-sky-400 font-medium hover:bg-sky-400/20 transition flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Compareceu
                                  </button>
                                  <button
                                    onClick={() => { setFinalizandoId(r.id); }}
                                    className="text-[11px] px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 font-medium hover:bg-gray-500/20 transition"
                                  >
                                    <Ban className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {coluna.key === "COMPARECEU" && !isVendido && (
                                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => { setFinalizandoId(r.id); }}
                                    className="flex-1 text-[11px] py-1.5 rounded-lg bg-gray-500/10 text-gray-400 font-medium hover:bg-gray-500/20 transition flex items-center justify-center gap-1"
                                  >
                                    <Ban className="w-3 h-3" />
                                    Finalizar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card content — EDIT */}
                          {isEditing && (
                            <div className="p-3.5 space-y-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm text-gray-100">{r.nomeCliente}</h4>
                                <button onClick={(e) => cancelarEdicao(e)} className="text-gray-500 hover:text-gray-400 p-1">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {temVinculo && (
                                <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-400/10 rounded-lg px-2.5 py-1.5 border border-amber-400/20">
                                  <Lock className="w-3 h-3" />
                                  Vinculada — somente consideracoes editaveis
                                </div>
                              )}

                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Data da Reuniao</label>
                                <input
                                  type="date"
                                  value={editData.dataReuniao}
                                  onChange={(e) => setEditData({ ...editData, dataReuniao: e.target.value })}
                                  className={`${inputClass} !py-2 !text-xs ${temVinculo ? "opacity-50 cursor-not-allowed" : ""}`}
                                  disabled={temVinculo}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Compareceu?</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => !temVinculo && setEditData({ ...editData, compareceu: true, motivoNaoCompareceu: "", statusLead: "COMPARECEU" })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition border ${
                                      editData.compareceu
                                        ? "bg-sky-400/10 border-sky-400/30 text-sky-400"
                                        : "border-[#232a3b] text-gray-400 hover:bg-[#232a3b]"
                                    } ${temVinculo ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={temVinculo}
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => !temVinculo && setEditData({ ...editData, compareceu: false, statusLead: "AGENDADO" })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition border ${
                                      !editData.compareceu
                                        ? "bg-red-400/10 border-red-400/30 text-red-400"
                                        : "border-[#232a3b] text-gray-400 hover:bg-[#232a3b]"
                                    } ${temVinculo ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={temVinculo}
                                  >
                                    Nao
                                  </button>
                                </div>
                              </div>

                              {!editData.compareceu && !temVinculo && (
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Motivo</label>
                                  <select
                                    value={editData.motivoNaoCompareceu}
                                    onChange={(e) => setEditData({ ...editData, motivoNaoCompareceu: e.target.value })}
                                    className={`${inputClass} !py-2 !text-xs`}
                                  >
                                    <option value="">Selecione...</option>
                                    {MOTIVOS_NAO_COMPARECEU.map((m) => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1">Consideracoes</label>
                                <textarea
                                  value={editData.consideracoes}
                                  onChange={(e) => setEditData({ ...editData, consideracoes: e.target.value })}
                                  className={`${inputClass} h-16 resize-none !py-2 !text-xs`}
                                  placeholder="Observacoes..."
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => cancelarEdicao(e)}
                                  className="flex-1 px-3 py-2 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition text-xs"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => salvarEdicao(r.id, temVinculo)}
                                  disabled={editLoading}
                                  className="flex-1 px-3 py-2 rounded-lg bg-sky-400 text-gray-900 font-medium hover:bg-sky-300 transition text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  {editLoading ? "..." : <><Save className="w-3 h-3" /> Salvar</>}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

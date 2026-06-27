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
  Paperclip,
  Image,
} from "lucide-react";
import { MOTIVOS_NAO_COMPARECEU, MOTIVOS_FINALIZACAO, COLUNAS_KANBAN } from "@/lib/sdr";
import type { StatusLead } from "@/lib/sdr";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentoAnexado } from "@/components/DocumentoAnexado";

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
  temImagem: boolean;
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

// Cores por coluna — alinhadas aos tokens LIV
const colunaConfig: Record<string, { border: string; bg: string; text: string; badge: string; icon: React.ReactNode; count: string }> = {
  AGENDADO: {
    border: "border-liv-gold/30",
    bg: "bg-liv-gold/5",
    text: "text-liv-gold",
    badge: "bg-liv-gold/12 text-liv-gold",
    icon: <CalendarClock className="w-4 h-4" />,
    count: "bg-liv-gold/20 text-liv-gold",
  },
  COMPARECEU: {
    border: "border-liv-info/30",
    bg: "bg-liv-info/5",
    text: "text-liv-info",
    badge: "bg-liv-info/12 text-liv-info",
    icon: <CheckCircle className="w-4 h-4" />,
    count: "bg-liv-info/20 text-liv-info",
  },
  FINALIZADO: {
    border: "border-liv-faint/30",
    bg: "bg-liv-faint/5",
    text: "text-liv-muted",
    badge: "bg-liv-faint/12 text-liv-muted",
    icon: <Ban className="w-4 h-4" />,
    count: "bg-liv-faint/20 text-liv-muted",
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
  const [telefone, setTelefone] = useState("");
  const [vendedoraId, setVendedoraId] = useState("");
  const [dataReuniao, setDataReuniao] = useState(new Date().toISOString().split("T")[0]);
  const [compareceu, setCompareceu] = useState(false);
  const [motivoNaoCompareceu, setMotivoNaoCompareceu] = useState("");
  const [consideracoes, setConsideracoes] = useState("");
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemNome, setImagemNome] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setFormErro("Arquivo muito grande. Máximo 15MB.");
      return;
    }
    setImagemNome(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImagemBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setNomeCliente("");
    setTelefone("");
    setVendedoraId("");
    setDataReuniao(new Date().toISOString().split("T")[0]);
    setCompareceu(false);
    setMotivoNaoCompareceu("");
    setConsideracoes("");
    setImagemBase64(null);
    setImagemNome("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormErro("");
    setFormSucesso(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro("");

    if (!telefone.trim()) {
      setFormErro("Telefone do cliente é obrigatório (com DDD)");
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch("/api/sdr/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente,
          telefone,
          vendedoraId,
          dataReuniao,
          compareceu,
          motivoNaoCompareceu: compareceu ? null : motivoNaoCompareceu,
          consideracoes,
          imagemUrl: imagemBase64 || null,
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
    "w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage/30 focus:border-liv-sage outline-none text-sm";
  const labelClass = "block text-sm font-medium text-liv-muted mb-1";

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
            className="bg-liv-surface rounded-2xl max-w-lg w-full border border-liv-line shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-liv-line">
              <div>
                <h3 className="font-bold text-lg text-liv-ink">{detalheRegistro.nomeCliente}</h3>
                <p className="text-sm text-liv-muted mt-0.5">Registro completo do lead</p>
              </div>
              <button onClick={() => setDetalheRegistro(null)} className="text-liv-faint hover:text-liv-ink transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-liv-faint" />
                    <p className="text-xs text-liv-faint">Vendedora</p>
                  </div>
                  <p className="text-sm font-medium text-liv-ink">{detalheRegistro.vendedora.nome}</p>
                </div>
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-liv-faint" />
                    <p className="text-xs text-liv-faint">Data da Reuniao</p>
                  </div>
                  <p className="text-sm font-medium text-liv-ink">
                    {new Date(detalheRegistro.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-liv-faint" />
                    <p className="text-xs text-liv-faint">Data do Registro</p>
                  </div>
                  <p className="text-sm font-medium text-liv-ink">
                    {new Date(detalheRegistro.dataRegistro + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-center gap-2 mb-1">
                    {detalheRegistro.compareceu ? (
                      <CheckCircle className="w-3.5 h-3.5 text-liv-info" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-liv-danger" />
                    )}
                    <p className="text-xs text-liv-faint">Compareceu</p>
                  </div>
                  <p className={`text-sm font-medium ${detalheRegistro.compareceu ? "text-liv-info" : "text-liv-danger"}`}>
                    {detalheRegistro.compareceu ? "Sim" : "Nao"}
                  </p>
                  {!detalheRegistro.compareceu && detalheRegistro.motivoNaoCompareceu && (
                    <p className="text-xs text-liv-danger/70 mt-0.5">{detalheRegistro.motivoNaoCompareceu}</p>
                  )}
                </div>
              </div>

              {detalheRegistro.statusLead === "FINALIZADO" && detalheRegistro.motivoFinalizacao && (
                <div className="bg-liv-danger/5 rounded-lg p-4 border border-liv-danger/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Ban className="w-3.5 h-3.5 text-liv-danger" />
                    <p className="text-xs text-liv-danger">Motivo da Finalizacao</p>
                  </div>
                  <p className="text-sm font-medium text-liv-danger">{detalheRegistro.motivoFinalizacao}</p>
                </div>
              )}

              {detalheRegistro.consideracoes && (
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-liv-faint" />
                    <p className="text-xs text-liv-faint">Consideracoes</p>
                  </div>
                  <p className="text-sm text-liv-muted whitespace-pre-wrap leading-relaxed">{detalheRegistro.consideracoes}</p>
                </div>
              )}

              {detalheRegistro.temImagem && (
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-line">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-3.5 h-3.5 text-liv-faint" />
                    <p className="text-xs text-liv-faint">Documento Anexado</p>
                  </div>
                  <DocumentoAnexado registroId={detalheRegistro.id} />
                </div>
              )}

              <div className="bg-liv-sage/8 rounded-lg p-4 border border-liv-sage/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-liv-sage" />
                  <p className="text-sm font-medium text-liv-sage">Comissoes</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-liv-muted">Reuniao</span>
                    <span className={`text-sm font-medium tabular-nums ${detalheRegistro.comissaoReuniao > 0 ? "text-liv-sage" : "text-liv-faint"}`}>
                      {formatCurrency(detalheRegistro.comissaoReuniao)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-liv-muted">Venda vinculada</span>
                    <span className={`text-sm font-medium tabular-nums ${detalheRegistro.comissaoVenda > 0 ? "text-liv-sage" : "text-liv-faint"}`}>
                      {formatCurrency(detalheRegistro.comissaoVenda)}
                    </span>
                  </div>
                  <div className="border-t border-liv-sage/20 pt-2 flex justify-between">
                    <span className="text-sm font-semibold text-liv-ink">Total</span>
                    <span className="text-sm font-bold tabular-nums text-liv-sage">{formatCurrency(detalheRegistro.comissaoTotal)}</span>
                  </div>
                </div>
              </div>

              {detalheRegistro.vendaVinculada && (
                <div className="bg-liv-surface-2 rounded-lg p-4 border border-liv-sage/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-3.5 h-3.5 text-liv-sage" />
                    <p className="text-xs font-medium text-liv-sage">Venda Vinculada</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-liv-muted">Cliente</span>
                      <span className="text-sm text-liv-ink">{detalheRegistro.vendaVinculada.cliente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-liv-muted">Valor</span>
                      <span className="text-sm font-medium tabular-nums text-liv-sage">{formatCurrency(detalheRegistro.vendaVinculada.valorVenda)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-liv-muted">Data conversao</span>
                      <span className="text-sm text-liv-ink">
                        {new Date(detalheRegistro.vendaVinculada.dataConversao).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-liv-surface-2 rounded-lg px-4 py-3 border border-liv-line">
                <span className="text-sm text-liv-muted">Status do Pagamento</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  detalheRegistro.statusPagamento === "PAGO"
                    ? "bg-liv-sage/12 text-liv-sage"
                    : "bg-liv-gold/12 text-liv-gold"
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
            className="bg-liv-surface rounded-2xl max-w-sm w-full border border-liv-line shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-liv-line">
              <h3 className="font-bold text-liv-ink">Finalizar Lead</h3>
              <p className="text-sm text-liv-muted mt-1">Selecione o motivo da finalizacao</p>
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
                  className="flex-1 px-4 py-2.5 rounded-lg border border-liv-line text-liv-muted font-medium hover:bg-liv-surface-2 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={finalizarLead}
                  disabled={!motivoFinal || finalizandoLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-liv-danger text-liv-ink font-medium hover:opacity-90 transition text-sm disabled:opacity-50"
                >
                  {finalizandoLoading ? "..." : "Finalizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        eyebrow="Pré-venda · SDR"
        title="Meus Registros"
        subtitle={getNomeMes(mesAtual)}
        actions={
          <>
            <input
              type="month"
              value={mesAtual}
              onChange={(e) => setMesAtual(e.target.value)}
              className="rounded-lg border border-liv-line bg-liv-surface-2 px-3 py-2 text-sm text-liv-ink"
            />
            <button
              onClick={() => {
                if (formAberto) resetForm();
                setFormAberto(!formAberto);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                formAberto
                  ? "bg-liv-surface-2 text-liv-muted border border-liv-line hover:bg-liv-surface"
                  : "bg-liv-sage text-liv-bg hover:bg-liv-sage-deep"
              }`}
            >
              <Plus
                className={`w-4 h-4 transition-transform duration-300 ${formAberto ? "rotate-45" : ""}`}
              />
              Novo Registro
            </button>
          </>
        }
      />

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
            className="bg-liv-surface rounded-xl p-6 border border-liv-line space-y-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-liv-ink">Novo Registro de Reuniao</h2>
              <button
                type="button"
                onClick={() => { resetForm(); setFormAberto(false); }}
                className="text-liv-faint hover:text-liv-ink transition"
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

            <div>
              <label className={labelClass}>Telefone (WhatsApp) *</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className={inputClass}
                placeholder="(84) 9 9999-9999"
                required
              />
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
                        ? "bg-liv-sage/10 border-liv-sage/30 text-liv-sage"
                        : "border-liv-line text-liv-muted hover:bg-liv-surface-2"
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareceu(false)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                      !compareceu
                        ? "bg-liv-danger/10 border-liv-danger/30 text-liv-danger"
                        : "border-liv-line text-liv-muted hover:bg-liv-surface-2"
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

            <div>
              <label className={labelClass}>Documento / Conta de Luz (máx 15MB)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-liv-line bg-liv-surface-2 text-liv-muted hover:border-liv-sage/50 hover:text-liv-sage cursor-pointer transition text-sm">
                  <Paperclip className="w-4 h-4" />
                  {imagemNome ? imagemNome : "Anexar arquivo"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {imagemBase64 && (
                  <button
                    type="button"
                    onClick={() => { setImagemBase64(null); setImagemNome(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-liv-danger hover:opacity-80 text-xs flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>
              {imagemBase64 && imagemBase64.startsWith("data:image") && (
                <img src={imagemBase64} alt="preview" className="mt-2 max-h-32 rounded-lg border border-liv-line object-contain" />
              )}
            </div>

            {compareceu && (
              <div className="bg-liv-sage/10 border border-liv-sage/20 rounded-lg px-4 py-3">
                <p className="text-sm text-liv-sage">
                  Comissao por reuniao comparecida: <strong>R$ 20,00</strong>
                </p>
              </div>
            )}

            {formErro && (
              <div className="bg-liv-danger/10 text-liv-danger px-4 py-3 rounded-lg text-sm">{formErro}</div>
            )}
            {formSucesso && (
              <div className="bg-liv-sage/10 text-liv-sage px-4 py-3 rounded-lg text-sm">Registro criado com sucesso!</div>
            )}

            <button
              type="submit"
              disabled={formLoading || formSucesso}
              className="w-full bg-liv-sage text-liv-bg py-3 rounded-lg font-semibold hover:bg-liv-sage-deep transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-liv-bg"></div>
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
        <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
          <p className="text-xs text-liv-faint">Total</p>
          <p className="text-lg font-bold tabular-nums text-liv-ink mt-0.5">{registros.length}</p>
        </div>
        <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
          <p className="text-xs text-liv-faint">Compareceram</p>
          <p className="text-lg font-bold tabular-nums text-liv-info mt-0.5">
            {registros.filter((r) => r.compareceu).length}
          </p>
        </div>
        <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
          <p className="text-xs text-liv-faint">Venderam</p>
          <p className="text-lg font-bold tabular-nums text-liv-sage mt-0.5">
            {registros.filter((r) => r.statusLead === "VENDIDO").length}
          </p>
        </div>
        <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
          <p className="text-xs text-liv-faint">Comissao</p>
          <p className="text-lg font-bold tabular-nums text-liv-sage mt-0.5">
            {formatCurrency(registros.reduce((s, r) => s + r.comissaoTotal, 0))}
          </p>
        </div>
      </div>

      {/* KANBAN */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage"></div>
        </div>
      ) : registros.length === 0 ? (
        <div className="bg-liv-surface rounded-xl p-12 border border-liv-line text-center">
          <ClipboardList className="w-12 h-12 text-liv-faint mx-auto mb-4" />
          <h3 className="text-lg font-medium text-liv-ink mb-2">Nenhum registro neste mes</h3>
          <button
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-2 bg-liv-sage text-liv-bg px-6 py-3 rounded-lg font-medium hover:bg-liv-sage-deep transition"
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
                        <p className="text-[11px] text-liv-faint">{coluna.sublabel}</p>
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
                    <div className="rounded-lg border border-dashed border-liv-line p-6 text-center">
                      <p className="text-xs text-liv-faint">Nenhum lead</p>
                    </div>
                  ) : (
                    regs.map((r) => {
                      const isEditing = editandoId === r.id;
                      const temVinculo = !!r.vendaVinculadaId;
                      const isVendido = r.statusLead === "VENDIDO";

                      return (
                        <div
                          key={r.id}
                          className={`bg-liv-surface rounded-lg border overflow-hidden transition-all ${
                            isEditing ? "border-liv-sage/40" : "border-liv-line hover:border-liv-line/80"
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
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-medium text-sm text-liv-ink truncate">{r.nomeCliente}</h4>
                                    {r.temImagem && <Paperclip className="w-3 h-3 text-liv-faint flex-shrink-0" />}
                                  </div>
                                  <p className="text-[11px] text-liv-faint mt-0.5">
                                    {r.vendedora.nome} · {new Date(r.dataReuniao + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => iniciarEdicao(r, e)}
                                    className="text-liv-faint hover:text-liv-sage transition p-1 rounded hover:bg-liv-sage/10"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {!temVinculo && r.statusLead !== "FINALIZADO" && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); excluirRegistro(r.id, e); }}
                                      className="text-liv-faint hover:text-liv-danger transition p-1 rounded hover:bg-liv-danger/10"
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
                                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-liv-sage/14 text-liv-sage font-medium">
                                    <ShoppingCart className="w-2.5 h-2.5" />
                                    Vendeu
                                  </span>
                                )}
                                {!r.compareceu && r.motivoNaoCompareceu && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-liv-danger/10 text-liv-danger font-medium">
                                    {r.motivoNaoCompareceu}
                                  </span>
                                )}
                                {r.statusLead === "FINALIZADO" && r.motivoFinalizacao && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-liv-faint/12 text-liv-muted font-medium">
                                    {r.motivoFinalizacao}
                                  </span>
                                )}
                                {r.comissaoTotal > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-liv-sage/10 text-liv-sage font-medium tabular-nums ml-auto">
                                    {formatCurrency(r.comissaoTotal)}
                                  </span>
                                )}
                              </div>

                              {/* Considerações */}
                              {r.consideracoes && (
                                <p className="text-[11px] text-liv-faint leading-relaxed line-clamp-2">
                                  {r.consideracoes}
                                </p>
                              )}

                              {/* Ações rápidas da coluna */}
                              {coluna.key === "AGENDADO" && (
                                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => marcarCompareceu(r.id)}
                                    className="flex-1 text-[11px] py-1.5 rounded-lg bg-liv-sage/10 text-liv-sage font-medium hover:bg-liv-sage/20 transition flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Compareceu
                                  </button>
                                  <button
                                    onClick={() => { setFinalizandoId(r.id); }}
                                    className="text-[11px] px-3 py-1.5 rounded-lg bg-liv-faint/10 text-liv-muted font-medium hover:bg-liv-faint/20 transition"
                                  >
                                    <Ban className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {coluna.key === "COMPARECEU" && !isVendido && (
                                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => { setFinalizandoId(r.id); }}
                                    className="flex-1 text-[11px] py-1.5 rounded-lg bg-liv-faint/10 text-liv-muted font-medium hover:bg-liv-faint/20 transition flex items-center justify-center gap-1"
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
                                <h4 className="font-medium text-sm text-liv-ink">{r.nomeCliente}</h4>
                                <button onClick={(e) => cancelarEdicao(e)} className="text-liv-faint hover:text-liv-ink p-1">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {temVinculo && (
                                <div className="flex items-center gap-2 text-[11px] text-liv-gold bg-liv-gold/10 rounded-lg px-2.5 py-1.5 border border-liv-gold/20">
                                  <Lock className="w-3 h-3" />
                                  Vinculada — somente consideracoes editaveis
                                </div>
                              )}

                              <div>
                                <label className="block text-[11px] font-medium text-liv-faint mb-1">Data da Reuniao</label>
                                <input
                                  type="date"
                                  value={editData.dataReuniao}
                                  onChange={(e) => setEditData({ ...editData, dataReuniao: e.target.value })}
                                  className={`${inputClass} !py-2 !text-xs ${temVinculo ? "opacity-50 cursor-not-allowed" : ""}`}
                                  disabled={temVinculo}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-liv-faint mb-1">Compareceu?</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => !temVinculo && setEditData({ ...editData, compareceu: true, motivoNaoCompareceu: "", statusLead: "COMPARECEU" })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition border ${
                                      editData.compareceu
                                        ? "bg-liv-sage/10 border-liv-sage/30 text-liv-sage"
                                        : "border-liv-line text-liv-muted hover:bg-liv-surface-2"
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
                                        ? "bg-liv-danger/10 border-liv-danger/30 text-liv-danger"
                                        : "border-liv-line text-liv-muted hover:bg-liv-surface-2"
                                    } ${temVinculo ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={temVinculo}
                                  >
                                    Nao
                                  </button>
                                </div>
                              </div>

                              {!editData.compareceu && !temVinculo && (
                                <div>
                                  <label className="block text-[11px] font-medium text-liv-faint mb-1">Motivo</label>
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
                                <label className="block text-[11px] font-medium text-liv-faint mb-1">Consideracoes</label>
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
                                  className="flex-1 px-3 py-2 rounded-lg border border-liv-line text-liv-muted font-medium hover:bg-liv-surface-2 transition text-xs"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => salvarEdicao(r.id, temVinculo)}
                                  disabled={editLoading}
                                  className="flex-1 px-3 py-2 rounded-lg bg-liv-sage text-liv-bg font-medium hover:bg-liv-sage-deep transition text-xs disabled:opacity-50 flex items-center justify-center gap-1"
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

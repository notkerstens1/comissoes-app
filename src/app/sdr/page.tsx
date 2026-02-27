"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ClipboardList, Users, DollarSign, CheckCircle, Edit2, X, Save, Phone } from "lucide-react";

interface DashboardData {
  totalRegistros: number;
  reunioesComparecidas: number;
  vendasVinculadas: number;
  comissaoReuniao: number;
  comissaoVenda: number;
  comissaoTotal: number;
  comissaoPendente: number;
  comissaoPaga: number;
}

interface Registro {
  id: string;
  nomeCliente: string;
  dataReuniao: string;
  compareceu: boolean;
  statusLead: string;
  motivoNaoCompareceu: string | null;
  motivoFinalizacao: string | null;
  consideracoes: string | null;
  vendedora: { nome: string };
  vendaVinculada: { id: string; cliente: string; valorVenda: number } | null;
}

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

const MOTIVOS_NAO_COMPARECEU = [
  "No-show",
  "Remarcou",
  "Cancelou",
  "Nao respondeu",
];

export default function SDRDashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Ligacoes do dia
  const hojeStr = new Date().toISOString().split("T")[0];
  const [ligacoesHoje, setLigacoesHoje] = useState(0);
  const [ligacoesInput, setLigacoesInput] = useState("");
  const [salvandoLigacoes, setSalvandoLigacoes] = useState(false);

  // Modal de edicao
  const [editando, setEditando] = useState<Registro | null>(null);
  const [editCompareceu, setEditCompareceu] = useState(false);
  const [editStatusLead, setEditStatusLead] = useState("");
  const [editMotivoFinalizacao, setEditMotivoFinalizacao] = useState("");
  const [editMotivoNaoCompareceu, setEditMotivoNaoCompareceu] = useState("");
  const [editConsideracoes, setEditConsideracoes] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Carregar ligacoes do dia
  useEffect(() => {
    fetch(`/api/sdr/ligacoes?data=${hojeStr}`)
      .then((r) => r.json())
      .then((d) => {
        setLigacoesHoje(d.quantidade ?? 0);
        setLigacoesInput(String(d.quantidade ?? 0));
      })
      .catch(console.error);
  }, [hojeStr]);

  const salvarLigacoes = async () => {
    setSalvandoLigacoes(true);
    try {
      const res = await fetch("/api/sdr/ligacoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: hojeStr, quantidade: Number(ligacoesInput) || 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setLigacoesHoje(data.quantidade);
      }
    } catch (error) {
      console.error("Erro:", error);
    }
    setSalvandoLigacoes(false);
  };

  useEffect(() => {
    fetchDados();
  }, [mesAtual]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const [resDash, resReg] = await Promise.all([
        fetch(`/api/sdr/dashboard?mes=${mesAtual}`),
        fetch(`/api/sdr/registros?mes=${mesAtual}`),
      ]);
      const dataDash = await resDash.json();
      const dataReg = await resReg.json();
      setDados(dataDash);
      setRegistros(dataReg);
    } catch (error) {
      console.error("Erro:", error);
    }
    setLoading(false);
  };

  const abrirEdicao = (reg: Registro) => {
    setEditando(reg);
    setEditCompareceu(reg.compareceu);
    setEditStatusLead(reg.statusLead);
    setEditMotivoFinalizacao(reg.motivoFinalizacao || "");
    setEditMotivoNaoCompareceu(reg.motivoNaoCompareceu || "");
    setEditConsideracoes(reg.consideracoes || "");
  };

  const salvarEdicao = async () => {
    if (!editando) return;
    setSalvandoEdit(true);
    try {
      const payload: any = {
        compareceu: editCompareceu,
        statusLead: editStatusLead,
        consideracoes: editConsideracoes,
      };
      if (editStatusLead === "FINALIZADO") {
        payload.motivoFinalizacao = editMotivoFinalizacao;
      }
      if (!editCompareceu) {
        payload.motivoNaoCompareceu = editMotivoNaoCompareceu;
      }
      const res = await fetch(`/api/sdr/registros/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditando(null);
        fetchDados();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
    setSalvandoEdit(false);
  };

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      AGENDADO: "bg-blue-400/10 text-blue-400",
      COMPARECEU: "bg-lime-400/10 text-lime-400",
      VENDIDO: "bg-emerald-400/10 text-emerald-400",
      FINALIZADO: "bg-gray-500/10 text-gray-400",
    };
    return map[status] || "bg-gray-500/10 text-gray-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  const cards = [
    { label: "Reunioes Comparecidas", value: dados?.reunioesComparecidas ?? 0, icon: Users, format: "number" },
    { label: "Vendas Vinculadas", value: dados?.vendasVinculadas ?? 0, icon: CheckCircle, format: "number" },
    { label: "Comissao Estimada", value: dados?.comissaoTotal ?? 0, icon: DollarSign, format: "currency" },
    {
      label: "Pendente / Paga",
      value: `${formatCurrency(dados?.comissaoPendente ?? 0)} / ${formatCurrency(dados?.comissaoPaga ?? 0)}`,
      icon: ClipboardList,
      format: "text",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modal de Edicao */}
      {editando && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1f2e] rounded-2xl max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-[#232a3b]">
              <h3 className="font-bold text-gray-100">Editar Registro</h3>
              <button onClick={() => setEditando(null)} className="text-gray-500 hover:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#141820] rounded-lg p-3">
                <p className="text-sm text-gray-400">Cliente</p>
                <p className="font-medium text-gray-100">{editando.nomeCliente}</p>
                <p className="text-xs text-gray-500 mt-1">Vendedora: {editando.vendedora.nome}</p>
              </div>

              {/* Compareceu */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Compareceu?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditCompareceu(true)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      editCompareceu ? "bg-lime-400/20 text-lime-400 border border-lime-400/30" : "bg-[#141820] text-gray-400 border border-[#232a3b]"
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setEditCompareceu(false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      !editCompareceu ? "bg-red-400/20 text-red-400 border border-red-400/30" : "bg-[#141820] text-gray-400 border border-[#232a3b]"
                    }`}
                  >
                    Nao
                  </button>
                </div>
              </div>

              {/* Motivo nao compareceu */}
              {!editCompareceu && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Motivo</label>
                  <select
                    value={editMotivoNaoCompareceu}
                    onChange={(e) => setEditMotivoNaoCompareceu(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {MOTIVOS_NAO_COMPARECEU.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Lead */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Status do Lead</label>
                <select
                  value={editStatusLead}
                  onChange={(e) => setEditStatusLead(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                >
                  <option value="AGENDADO">Agendado</option>
                  <option value="COMPARECEU">Compareceu</option>
                  <option value="FINALIZADO">Finalizado</option>
                </select>
              </div>

              {/* Motivo Finalizacao */}
              {editStatusLead === "FINALIZADO" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Motivo Finalizacao</label>
                  <select
                    value={editMotivoFinalizacao}
                    onChange={(e) => setEditMotivoFinalizacao(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {MOTIVOS_FINALIZACAO.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Consideracoes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Consideracoes</label>
                <textarea
                  value={editConsideracoes}
                  onChange={(e) => setEditConsideracoes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm resize-none"
                  placeholder="Observacoes..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-[#232a3b] flex gap-3">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdit}
                className="flex-1 px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvandoEdit ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <><Save className="w-4 h-4" /> Salvar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard SDR</h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {/* Ligacoes do dia */}
      <div className="bg-gradient-to-r from-sky-500/20 to-cyan-500/20 rounded-2xl p-5 border border-sky-400/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sky-400/20 rounded-xl flex items-center justify-center">
            <Phone className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="text-sky-300 text-sm font-medium">Ligacoes de Hoje</p>
            <p className="text-3xl font-bold text-gray-100">{ligacoesHoje}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={ligacoesInput}
            onChange={(e) => setLigacoesInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvarLigacoes()}
            className="w-24 px-3 py-2 rounded-lg border border-sky-400/30 bg-[#141820] text-gray-100 text-sm text-center focus:border-sky-400 outline-none"
            placeholder="0"
          />
          <button
            onClick={salvarLigacoes}
            disabled={salvandoLigacoes}
            className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {salvandoLigacoes ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <><Save className="w-4 h-4" /> Salvar</>
            )}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
                <card.icon className="w-5 h-5 text-sky-400" />
              </div>
              <p className="text-sm text-gray-400">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-100">
              {card.format === "currency" ? formatCurrency(card.value as number) : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="bg-gradient-to-r from-sky-500/20 to-cyan-500/20 rounded-2xl p-8 border border-sky-400/20">
        <p className="text-sky-300 text-sm font-medium">Comissao Total do Mes</p>
        <p className="text-4xl font-bold mt-2 text-gray-100">
          {formatCurrency(dados?.comissaoTotal ?? 0)}
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-sky-300/70 text-xs">Total Registros</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{dados?.totalRegistros ?? 0}</p>
          </div>
          <div>
            <p className="text-sky-300/70 text-xs">Comissao Reunioes</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.comissaoReuniao ?? 0)}</p>
          </div>
          <div>
            <p className="text-sky-300/70 text-xs">Comissao Vendas</p>
            <p className="text-lg font-semibold mt-1 text-gray-100">{formatCurrency(dados?.comissaoVenda ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Lista de Registros com Edicao */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-sky-400" />
          Meus Registros
        </h2>
        {registros.length === 0 ? (
          <div className="bg-[#1a1f2e] rounded-xl p-8 border border-[#232a3b] text-center">
            <p className="text-gray-400">Nenhum registro neste mes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {registros.map((reg) => (
              <div
                key={reg.id}
                className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b] flex items-center gap-4 hover:bg-[#1e2433] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-100 truncate">{reg.nomeCliente}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(reg.statusLead)}`}>
                      {reg.statusLead}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    <span>Vendedora: {reg.vendedora.nome}</span>
                    <span>Reuniao: {reg.dataReuniao}</span>
                    {reg.compareceu && <span className="text-lime-400">Compareceu</span>}
                    {!reg.compareceu && <span className="text-red-400">Nao compareceu</span>}
                    {reg.vendaVinculada && (
                      <span className="text-emerald-400">Venda: {formatCurrency(reg.vendaVinculada.valorVenda)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => abrirEdicao(reg)}
                  className="p-2 rounded-lg hover:bg-sky-400/10 text-gray-500 hover:text-sky-400 transition flex-shrink-0"
                  title="Editar registro"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

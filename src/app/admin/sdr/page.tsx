"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Users,
  CalendarCheck,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Ban,
  ShoppingCart,
  CalendarClock,
  Phone,
  ChevronLeft,
  ChevronRight,
  UserX,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── tipos ───────────────────────────────────────────────────────────────────

type RegistroItem = {
  id: string;
  nomeCliente: string;
  dataReuniao: string;
  compareceu: boolean;
  motivoNaoCompareceu: string | null;
  motivoFinalizacao: string | null;
  statusLead: string;
  sdrNome: string | null;
  vendaVinculada: { cliente: string; valorVenda: number } | null;
};

type VendedorRow = {
  id: string;
  nome: string;
  totalOportunidades: number;
  reunioesFeitas: number;
  cpfNegado: number;
  desqualificados: number;
  vendas: number;
  registros: RegistroItem[];
};

type LigacaoDia = { data: string; count: number };

type DashboardData = {
  totalLigacoes: number;
  totalReunioes: number;
  totalCpfNegado: number;
  totalNoShow: number;
  totalDesqualificados: number;
  ligacoesPorDia: LigacaoDia[];
  motivosNaoCompareceu: { motivo: string; count: number }[];
  motivosFinalizacao: { motivo: string; count: number }[];
  porVendedor: VendedorRow[];
};

type SDRRanking = {
  id: string;
  nome: string;
  totalRegistros: number;
  reunioes: number;
  vendas: number;
  taxaConversao: number;
  comissaoTotal: number;
  comissaoPendente: number;
  comissaoPaga: number;
};

type TipoFiltro = "dia" | "semana" | "mes";

// ─── helpers de data ──────────────────────────────────────────────────────────

function hojeStr() {
  return new Date().toISOString().split("T")[0];
}

function mesAtualStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function domingoSemana(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.toISOString().split("T")[0];
}

function sabadoSemana(domingoStr: string): string {
  const [y, m, d] = domingoStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + 6);
  return date.toISOString().split("T")[0];
}

function addDias(dateStr: string, dias: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + dias);
  return date.toISOString().split("T")[0];
}

function addMes(mesStr: string, delta: number): string {
  const [y, m] = mesStr.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatDiaSemana(d: string) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(y, m - 1, day);
  return `${dias[date.getDay()]} ${day}/${m}`;
}

function getNomeMes(mesStr: string) {
  const [ano, mm] = mesStr.split("-");
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[parseInt(mm) - 1]} ${ano}`;
}

// ─── helpers de UI ────────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "AGENDADO":
      return { label: "Agendado", color: "text-amber-400", bg: "bg-amber-400/15", icon: <CalendarClock className="w-3 h-3" /> };
    case "COMPARECEU":
      return { label: "Compareceu", color: "text-sky-400", bg: "bg-sky-400/15", icon: <CheckCircle className="w-3 h-3" /> };
    case "VENDIDO":
      return { label: "Vendido", color: "text-emerald-400", bg: "bg-emerald-400/15", icon: <ShoppingCart className="w-3 h-3" /> };
    case "FINALIZADO":
      return { label: "Finalizado", color: "text-gray-400", bg: "bg-gray-500/15", icon: <Ban className="w-3 h-3" /> };
    default:
      return { label: status, color: "text-gray-400", bg: "bg-gray-500/15", icon: null };
  }
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-gray-300 w-44 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-[#0b0f19] rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-100 w-6 text-right flex-shrink-0">{count}</span>
    </div>
  );
}

// ─── página principal unificada ──────────────────────────────────────────────

export default function VisaoGeralSDRPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [ranking, setRanking] = useState<SDRRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState<TipoFiltro>("mes");
  const [diaAtual, setDiaAtual] = useState(hojeStr());
  const [domingoAtual, setDomingoAtual] = useState(() => domingoSemana(hojeStr()));
  const [mesAtual, setMesAtual] = useState(mesAtualStr());

  const [expandido, setExpandido] = useState<string | null>(null);

  const buildParams = useCallback(() => {
    if (tipo === "dia") return `tipo=dia&data=${diaAtual}`;
    if (tipo === "semana") return `tipo=semana&semana=${domingoAtual}`;
    return `tipo=mes&mes=${mesAtual}`;
  }, [tipo, diaAtual, domingoAtual, mesAtual]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Busca dashboard (métricas) e ranking (comissões) em paralelo
      const [dashRes, rankRes] = await Promise.all([
        fetch(`/api/admin/sdr/dashboard?${buildParams()}`),
        fetch(`/api/admin/sdr/resumo?mes=${mesAtual}`),
      ]);
      setData(await dashRes.json());
      const rankData = await rankRes.json();
      setRanking(rankData.ranking ?? []);
    } finally {
      setLoading(false);
    }
  }, [buildParams, mesAtual]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const labelPeriodo = () => {
    if (tipo === "dia") return formatDate(diaAtual);
    if (tipo === "semana") {
      const sab = sabadoSemana(domingoAtual);
      return `${formatDate(domingoAtual)} — ${formatDate(sab)}`;
    }
    return getNomeMes(mesAtual);
  };

  const anterior = () => {
    if (tipo === "dia") setDiaAtual((d) => addDias(d, -1));
    else if (tipo === "semana") setDomingoAtual((d) => addDias(d, -7));
    else setMesAtual((m) => addMes(m, -1));
  };
  const proximo = () => {
    if (tipo === "dia") setDiaAtual((d) => addDias(d, 1));
    else if (tipo === "semana") setDomingoAtual((d) => addDias(d, 7));
    else setMesAtual((m) => addMes(m, 1));
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    );
  }

  const maxNc = data.motivosNaoCompareceu[0]?.count ?? 1;
  const maxFin = data.motivosFinalizacao[0]?.count ?? 1;
  const maxLig = Math.max(...data.ligacoesPorDia.map((l) => l.count), 1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            Visão Geral SDR
          </h1>
          <p className="text-gray-400 text-sm mt-1">{labelPeriodo()}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-[#232a3b]">
            {(["dia", "semana", "mes"] as TipoFiltro[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                  tipo === t
                    ? "bg-sky-500 text-white"
                    : "bg-[#141820] text-gray-400 hover:text-gray-200"
                }`}
              >
                {t === "dia" ? "Dia" : t === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={anterior} className="p-2 rounded-lg bg-[#141820] border border-[#232a3b] text-gray-400 hover:text-gray-200 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {tipo === "dia" && (
              <input type="date" value={diaAtual} onChange={(e) => setDiaAtual(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100" />
            )}
            {tipo === "semana" && (
              <input type="date" value={domingoAtual} onChange={(e) => setDomingoAtual(domingoSemana(e.target.value))}
                className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
                title="Selecione qualquer dia da semana" />
            )}
            {tipo === "mes" && (
              <input type="month" value={mesAtual} onChange={(e) => setMesAtual(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100" />
            )}
            <button onClick={proximo} className="p-2 rounded-lg bg-[#141820] border border-[#232a3b] text-gray-400 hover:text-gray-200 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-sky-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-sky-400" /></div>
            <p className="text-xs text-gray-400">Ligações</p>
          </div>
          <p className="text-3xl font-bold text-gray-100">{data.totalLigacoes}</p>
          <p className="text-xs text-gray-500 mt-1">contatos no período</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><CalendarCheck className="w-4 h-4 text-emerald-400" /></div>
            <p className="text-xs text-gray-400">Reuniões</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{data.totalReunioes}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.totalLigacoes > 0 ? `${Math.round((data.totalReunioes / data.totalLigacoes) * 100)}% de presença` : "—"}
          </p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-rose-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><XCircle className="w-4 h-4 text-rose-400" /></div>
            <p className="text-xs text-gray-400">CPF Negado</p>
          </div>
          <p className="text-3xl font-bold text-rose-400">{data.totalCpfNegado}</p>
          <p className="text-xs text-gray-500 mt-1">leads por CPF</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-orange-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><UserX className="w-4 h-4 text-orange-400" /></div>
            <p className="text-xs text-gray-400">Desqualificados</p>
          </div>
          <p className="text-3xl font-bold text-orange-400">{data.totalDesqualificados}</p>
          <p className="text-xs text-gray-500 mt-1">leads finalizados</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-400/10 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-amber-400" /></div>
            <p className="text-xs text-gray-400">No-shows</p>
          </div>
          <p className="text-3xl font-bold text-amber-400">{data.totalNoShow}</p>
          <p className="text-xs text-gray-500 mt-1">não compareceram</p>
        </div>
      </div>

      {/* Ligações por dia */}
      {data.ligacoesPorDia.length > 0 && tipo !== "dia" && (
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-sky-400" />
            Ligações por Dia
          </h2>
          <div className="space-y-1">
            {data.ligacoesPorDia.map((l) => (
              <BarRow key={l.data} label={formatDiaSemana(l.data)} count={l.count} max={maxLig} color="bg-sky-500" />
            ))}
          </div>
        </div>
      )}

      {/* Motivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Motivos de Não Comparecimento
          </h2>
          {data.motivosNaoCompareceu.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum registro</p>
          ) : (
            <div className="space-y-1">
              {data.motivosNaoCompareceu.map((m) => (
                <BarRow key={m.motivo} label={m.motivo} count={m.count} max={maxNc} color="bg-amber-400" />
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Ban className="w-4 h-4 text-gray-400" />
            Motivos de Finalização
          </h2>
          {data.motivosFinalizacao.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum registro</p>
          ) : (
            <div className="space-y-1">
              {data.motivosFinalizacao.map((m) => (
                <BarRow key={m.motivo} label={m.motivo} count={m.count} max={maxFin}
                  color={m.motivo === "CPF negada" ? "bg-rose-400" : "bg-gray-500"} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Oportunidades por Vendedor */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#232a3b] flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Oportunidades por Vendedor</h2>
          <span className="ml-auto text-xs text-gray-500">clique para ver as oportunidades</span>
        </div>
        {data.porVendedor.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma oportunidade registrada</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#141820] border-b border-[#232a3b] text-xs font-semibold text-gray-500 uppercase">
              <div className="col-span-3">Vendedor</div>
              <div className="col-span-2 text-center">Ligações</div>
              <div className="col-span-2 text-center">Reuniões</div>
              <div className="col-span-2 text-center">CPF Neg.</div>
              <div className="col-span-1 text-center">Desq.</div>
              <div className="col-span-2 text-center">Vendas</div>
            </div>
            {data.porVendedor.map((v) => (
              <div key={v.id}>
                <button
                  onClick={() => setExpandido(expandido === v.id ? null : v.id)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#232a3b] hover:bg-[#232a3b]/50 transition text-left"
                >
                  <div className="col-span-3 flex items-center gap-2 font-medium text-sky-400 text-sm">
                    {expandido === v.id ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                    {v.nome}
                  </div>
                  <div className="col-span-2 text-center text-sky-300 font-semibold text-sm">{v.totalOportunidades}</div>
                  <div className="col-span-2 text-center text-emerald-400 font-semibold text-sm">{v.reunioesFeitas}</div>
                  <div className="col-span-2 text-center"><span className={`font-semibold text-sm ${v.cpfNegado > 0 ? "text-rose-400" : "text-gray-500"}`}>{v.cpfNegado}</span></div>
                  <div className="col-span-1 text-center"><span className={`font-semibold text-sm ${v.desqualificados > 0 ? "text-orange-400" : "text-gray-500"}`}>{v.desqualificados}</span></div>
                  <div className="col-span-2 text-center"><span className={`font-semibold text-sm ${v.vendas > 0 ? "text-lime-400" : "text-gray-500"}`}>{v.vendas}</span></div>
                </button>
                {expandido === v.id && (
                  <div className="border-b border-[#232a3b] bg-[#0b0f19]">
                    {v.registros.length === 0 ? (
                      <p className="px-8 py-4 text-sm text-gray-500">Sem registros</p>
                    ) : (
                      <div className="divide-y divide-[#1a1f2e]">
                        <div className="grid grid-cols-12 gap-2 px-8 py-2 text-xs font-semibold text-gray-600 uppercase">
                          <div className="col-span-3">Cliente</div>
                          <div className="col-span-2">Reunião</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-2">SDR</div>
                          <div className="col-span-3">Obs.</div>
                        </div>
                        {v.registros.map((r) => {
                          const sc = statusConfig(r.statusLead);
                          const obs = r.vendaVinculada
                            ? `Venda: ${formatCurrency(r.vendaVinculada.valorVenda)}`
                            : r.motivoFinalizacao ?? r.motivoNaoCompareceu ?? "—";
                          return (
                            <div key={r.id} className="grid grid-cols-12 gap-2 px-8 py-2.5 hover:bg-[#1a1f2e]/50 transition text-sm">
                              <div className="col-span-3 font-medium text-gray-100 truncate">{r.nomeCliente}</div>
                              <div className="col-span-2 text-gray-400">{formatDate(r.dataReuniao)}</div>
                              <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>{sc.icon}{sc.label}</span>
                              </div>
                              <div className="col-span-2 text-gray-400 truncate">{r.sdrNome ?? "—"}</div>
                              <div className="col-span-3 text-gray-400 truncate text-xs">{obs}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ranking de SDRs (comissões — sempre mensal) ────────────────────────── */}
      {ranking.length > 0 && (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#232a3b] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Ranking de SDRs — {getNomeMes(mesAtual)}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820] text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">SDR</th>
                  <th className="text-center px-4 py-3 font-medium">Registros</th>
                  <th className="text-center px-4 py-3 font-medium">Reuniões</th>
                  <th className="text-center px-4 py-3 font-medium">Vendas</th>
                  <th className="text-center px-4 py-3 font-medium">Conversão</th>
                  <th className="text-right px-4 py-3 font-medium">Comissão</th>
                  <th className="text-right px-4 py-3 font-medium">Pendente</th>
                  <th className="text-right px-4 py-3 font-medium">Paga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3b]">
                {ranking.map((sdr, i) => (
                  <tr key={sdr.id} className="hover:bg-[#232a3b]">
                    <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-100">{sdr.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{sdr.totalRegistros}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{sdr.reunioes}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{sdr.vendas}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        sdr.taxaConversao >= 50 ? "bg-sky-400/15 text-sky-400"
                        : sdr.taxaConversao >= 30 ? "bg-amber-400/15 text-amber-400"
                        : "bg-red-400/15 text-red-400"
                      }`}>{sdr.taxaConversao}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sky-400">{formatCurrency(sdr.comissaoTotal)}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(sdr.comissaoPendente)}</td>
                    <td className="px-4 py-3 text-right text-sky-400">{formatCurrency(sdr.comissaoPaga)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

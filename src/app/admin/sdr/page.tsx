"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  CalendarPlus,
  Pencil,
  Check,
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

type OverrideData = {
  ligacoes: number | null;
  reunioesAgendadas: number | null;
  cpfNegado: number | null;
  desqualificados: number | null;
  noShow: number | null;
};

type DashboardData = {
  totalLigacoes: number;
  totalReunioes: number;
  totalReunioesAgendadas: number;
  totalCpfNegado: number;
  totalNoShow: number;
  totalDesqualificados: number;
  periodoKey: string;
  override: OverrideData | null;
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
      return { label: "Agendado", color: "text-liv-gold", bg: "bg-liv-gold/12", icon: <CalendarClock className="w-3 h-3" /> };
    case "COMPARECEU":
      return { label: "Compareceu", color: "text-liv-info", bg: "bg-liv-info/12", icon: <CheckCircle className="w-3 h-3" /> };
    case "VENDIDO":
      return { label: "Vendido", color: "text-liv-sage", bg: "bg-liv-sage/14", icon: <ShoppingCart className="w-3 h-3" /> };
    case "FINALIZADO":
      return { label: "Finalizado", color: "text-liv-muted", bg: "bg-liv-faint/12", icon: <Ban className="w-3 h-3" /> };
    default:
      return { label: status, color: "text-liv-muted", bg: "bg-liv-faint/12", icon: null };
  }
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-liv-muted w-44 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-liv-surface-2 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums text-liv-ink w-6 text-right flex-shrink-0">{count}</span>
    </div>
  );
}

// ─── card de métrica editável ─────────────────────────────────────────────────

function EditableMetricCard({
  icon, iconBg, label, value, subtitle, color, campo, periodoKey, onSaved,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  subtitle: string;
  color: string;
  campo: string;
  periodoKey: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Edição só é permitida na aba "dia" (override granular por dia)
  const canEdit = periodoKey.startsWith("dia:");

  const startEdit = () => {
    if (!canEdit) return;
    setInputVal(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/sdr/metricas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo: periodoKey, campo, valor: parseInt(inputVal, 10) || 0 }),
      });
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-liv-surface border border-liv-line rounded-2xl p-4 relative group">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <p className="text-xs text-liv-muted">{label}</p>
        {!editing && canEdit && (
          <button onClick={startEdit} className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-liv-surface-2 text-liv-faint hover:text-liv-ink transition" title="Editar">
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="number"
            min={0}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="w-24 text-2xl font-bold tabular-nums bg-liv-surface-2 border border-liv-line rounded-lg px-2 py-1 text-liv-ink focus:border-liv-sage outline-none"
          />
          <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-liv-sage text-liv-bg hover:bg-liv-sage-deep transition disabled:opacity-50">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-liv-surface-2 text-liv-muted hover:text-liv-ink transition text-xs">
            ✕
          </button>
        </div>
      ) : (
        <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      )}
      <p className="text-xs text-liv-faint mt-1">{subtitle}</p>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage" />
      </div>
    );
  }

  const maxNc = data.motivosNaoCompareceu[0]?.count ?? 1;
  const maxFin = data.motivosFinalizacao[0]?.count ?? 1;
  const maxLig = Math.max(...data.ligacoesPorDia.map((l) => l.count), 1);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Pré-venda · SDR</p>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-liv-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-liv-sage" />
            Visão Geral SDR
          </h1>
          <p className="text-liv-muted text-sm mt-1">{labelPeriodo()}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-liv-line">
            {(["dia", "semana", "mes"] as TipoFiltro[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                  tipo === t
                    ? "bg-liv-sage text-liv-bg"
                    : "bg-liv-surface-2 text-liv-muted hover:text-liv-ink"
                }`}
              >
                {t === "dia" ? "Dia" : t === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={anterior} className="p-2 rounded-lg bg-liv-surface-2 border border-liv-line text-liv-muted hover:text-liv-ink transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {tipo === "dia" && (
              <input type="date" value={diaAtual} onChange={(e) => setDiaAtual(e.target.value)}
                className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink" />
            )}
            {tipo === "semana" && (
              <input type="date" value={domingoAtual} onChange={(e) => setDomingoAtual(domingoSemana(e.target.value))}
                className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink"
                title="Selecione qualquer dia da semana" />
            )}
            {tipo === "mes" && (
              <input type="month" value={mesAtual} onChange={(e) => setMesAtual(e.target.value)}
                className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink" />
            )}
            <button onClick={proximo} className="p-2 rounded-lg bg-liv-surface-2 border border-liv-line text-liv-muted hover:text-liv-ink transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de métricas (editáveis pelo supervisor) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <EditableMetricCard
          icon={<Phone className="w-4 h-4 text-liv-info" />}
          iconBg="bg-liv-info/12"
          label="Ligações"
          value={data.totalLigacoes}
          subtitle="contatos no período"
          color="text-liv-ink"
          campo="ligacoes"
          periodoKey={data.periodoKey}
          onSaved={fetchData}
        />
        <EditableMetricCard
          icon={<CalendarPlus className="w-4 h-4 text-liv-violet" />}
          iconBg="bg-liv-violet/12"
          label="R. Agendadas"
          value={data.totalReunioesAgendadas}
          subtitle="reuniões marcadas"
          color="text-liv-violet"
          campo="reunioesAgendadas"
          periodoKey={data.periodoKey}
          onSaved={fetchData}
        />
        <div className="bg-liv-surface border border-liv-line rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-liv-sage/12 rounded-lg flex items-center justify-center flex-shrink-0"><CalendarCheck className="w-4 h-4 text-liv-sage" /></div>
            <p className="text-xs text-liv-muted">R. Efetivadas</p>
          </div>
          <p className="text-3xl font-bold tabular-nums text-liv-sage">{data.totalReunioes}</p>
          <p className="text-xs text-liv-faint mt-1">
            {data.totalReunioesAgendadas > 0 ? `${Math.round((data.totalReunioes / data.totalReunioesAgendadas) * 100)}% efetividade` : "—"}
          </p>
        </div>
        <EditableMetricCard
          icon={<XCircle className="w-4 h-4 text-liv-danger" />}
          iconBg="bg-liv-danger/12"
          label="CPF Negado"
          value={data.totalCpfNegado}
          subtitle="leads por CPF"
          color="text-liv-danger"
          campo="cpfNegado"
          periodoKey={data.periodoKey}
          onSaved={fetchData}
        />
        <EditableMetricCard
          icon={<UserX className="w-4 h-4 text-liv-orange" />}
          iconBg="bg-liv-orange/12"
          label="Desqualificados"
          value={data.totalDesqualificados}
          subtitle="leads finalizados"
          color="text-liv-orange"
          campo="desqualificados"
          periodoKey={data.periodoKey}
          onSaved={fetchData}
        />
        <EditableMetricCard
          icon={<AlertTriangle className="w-4 h-4 text-liv-gold" />}
          iconBg="bg-liv-gold/12"
          label="No-shows"
          value={data.totalNoShow}
          subtitle="não compareceram"
          color="text-liv-gold"
          campo="noShow"
          periodoKey={data.periodoKey}
          onSaved={fetchData}
        />
      </div>

      {/* Ligações por dia */}
      {data.ligacoesPorDia.length > 0 && tipo !== "dia" && (
        <div className="bg-liv-surface border border-liv-line rounded-2xl p-5">
          <h2 className="text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-liv-sage" />
            Ligações por Dia
          </h2>
          <div className="space-y-1">
            {data.ligacoesPorDia.map((l) => (
              <BarRow key={l.data} label={formatDiaSemana(l.data)} count={l.count} max={maxLig} color="bg-liv-info" />
            ))}
          </div>
        </div>
      )}

      {/* Motivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-liv-surface border border-liv-line rounded-2xl p-5">
          <h2 className="text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-liv-gold" />
            Motivos de Não Comparecimento
          </h2>
          {data.motivosNaoCompareceu.length === 0 ? (
            <p className="text-liv-faint text-sm">Nenhum registro</p>
          ) : (
            <div className="space-y-1">
              {data.motivosNaoCompareceu.map((m) => (
                <BarRow key={m.motivo} label={m.motivo} count={m.count} max={maxNc} color="bg-liv-gold" />
              ))}
            </div>
          )}
        </div>
        <div className="bg-liv-surface border border-liv-line rounded-2xl p-5">
          <h2 className="text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
            <Ban className="w-4 h-4 text-liv-muted" />
            Motivos de Finalização
          </h2>
          {data.motivosFinalizacao.length === 0 ? (
            <p className="text-liv-faint text-sm">Nenhum registro</p>
          ) : (
            <div className="space-y-1">
              {data.motivosFinalizacao.map((m) => (
                <BarRow key={m.motivo} label={m.motivo} count={m.count} max={maxFin}
                  color={m.motivo === "CPF negada" ? "bg-liv-danger" : "bg-liv-faint"} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Oportunidades por Vendedor */}
      <div className="bg-liv-surface border border-liv-line rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-liv-line flex items-center gap-2">
          <Users className="w-4 h-4 text-liv-sage" />
          <h2 className="text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em]">Oportunidades por Vendedor</h2>
          <span className="ml-auto text-xs text-liv-faint">clique para ver as oportunidades</span>
        </div>
        {data.porVendedor.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-liv-faint mx-auto mb-3" />
            <p className="text-liv-faint">Nenhuma oportunidade registrada</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-liv-surface-2 border-b border-liv-line text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em]">
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
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-liv-line hover:bg-liv-surface-2 transition text-left"
                >
                  <div className="col-span-3 flex items-center gap-2 font-medium text-liv-sage text-sm">
                    {expandido === v.id ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                    {v.nome}
                  </div>
                  <div className="col-span-2 text-center text-liv-info font-semibold text-sm tabular-nums">{v.totalOportunidades}</div>
                  <div className="col-span-2 text-center text-liv-sage font-semibold text-sm tabular-nums">{v.reunioesFeitas}</div>
                  <div className="col-span-2 text-center"><span className={`font-semibold text-sm tabular-nums ${v.cpfNegado > 0 ? "text-liv-danger" : "text-liv-faint"}`}>{v.cpfNegado}</span></div>
                  <div className="col-span-1 text-center"><span className={`font-semibold text-sm tabular-nums ${v.desqualificados > 0 ? "text-liv-orange" : "text-liv-faint"}`}>{v.desqualificados}</span></div>
                  <div className="col-span-2 text-center"><span className={`font-semibold text-sm tabular-nums ${v.vendas > 0 ? "text-liv-sage" : "text-liv-faint"}`}>{v.vendas}</span></div>
                </button>
                {expandido === v.id && (
                  <div className="border-b border-liv-line bg-liv-bg">
                    {v.registros.length === 0 ? (
                      <p className="px-8 py-4 text-sm text-liv-faint">Sem registros</p>
                    ) : (
                      <div className="divide-y divide-liv-line">
                        <div className="grid grid-cols-12 gap-2 px-8 py-2 text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em]">
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
                            <div key={r.id} className="grid grid-cols-12 gap-2 px-8 py-2.5 hover:bg-liv-surface-2 transition text-sm">
                              <div className="col-span-3 font-medium text-liv-ink truncate">{r.nomeCliente}</div>
                              <div className="col-span-2 text-liv-muted">{formatDate(r.dataReuniao)}</div>
                              <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>{sc.icon}{sc.label}</span>
                              </div>
                              <div className="col-span-2 text-liv-muted truncate">{r.sdrNome ?? "—"}</div>
                              <div className="col-span-3 text-liv-muted truncate text-xs">{obs}</div>
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
        <div className="bg-liv-surface rounded-2xl border border-liv-line overflow-hidden">
          <div className="px-6 py-4 border-b border-liv-line flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-liv-sage" />
            <h2 className="text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em]">
              Ranking de SDRs — {getNomeMes(mesAtual)}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-liv-surface-2 text-liv-faint">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">#</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">SDR</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Registros</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Reuniões</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Vendas</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Conversão</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Comissão</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Pendente</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Paga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {ranking.map((sdr, i) => (
                  <tr key={sdr.id} className="hover:bg-liv-surface-2">
                    <td className="px-4 py-3 text-liv-faint font-medium tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-liv-ink">{sdr.nome}</td>
                    <td className="px-4 py-3 text-center text-liv-muted tabular-nums">{sdr.totalRegistros}</td>
                    <td className="px-4 py-3 text-center text-liv-muted tabular-nums">{sdr.reunioes}</td>
                    <td className="px-4 py-3 text-center text-liv-muted tabular-nums">{sdr.vendas}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium tabular-nums ${
                        sdr.taxaConversao >= 50 ? "bg-liv-sage/14 text-liv-sage"
                        : sdr.taxaConversao >= 30 ? "bg-liv-gold/12 text-liv-gold"
                        : "bg-liv-danger/12 text-liv-danger"
                      }`}>{sdr.taxaConversao}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-liv-sage">{formatCurrency(sdr.comissaoTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-liv-gold">{formatCurrency(sdr.comissaoPendente)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-liv-sage">{formatCurrency(sdr.comissaoPaga)}</td>
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

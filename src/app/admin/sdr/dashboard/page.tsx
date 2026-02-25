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
  vendas: number;
  registros: RegistroItem[];
};

type DashboardData = {
  totalOportunidades: number;
  totalReunioes: number;
  totalCpfNegado: number;
  totalNoShow: number;
  motivosNaoCompareceu: { motivo: string; count: number }[];
  motivosFinalizacao: { motivo: string; count: number }[];
  porVendedor: VendedorRow[];
};

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function formatDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── componente de barra horizontal simples ───────────────────────────────────

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

// ─── página principal ─────────────────────────────────────────────────────────

export default function DashboardSDRPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [expandido, setExpandido] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sdr/dashboard?mes=${mes}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getNomeMes = (m: string) => {
    const [ano, mm] = m.split("-");
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return `${meses[parseInt(mm) - 1]} ${ano}`;
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            Dashboard de Oportunidades SDR
          </h1>
          <p className="text-gray-400 text-sm mt-1">{getNomeMes(mes)}</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-sky-400/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-xs text-gray-400">Oportunidades</p>
          </div>
          <p className="text-3xl font-bold text-gray-100">{data.totalOportunidades}</p>
          <p className="text-xs text-gray-500 mt-1">registros no período</p>
        </div>

        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-400/10 rounded-lg flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-gray-400">Reuniões Realizadas</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{data.totalReunioes}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.totalOportunidades > 0
              ? `${Math.round((data.totalReunioes / data.totalOportunidades) * 100)}% de presença`
              : "—"}
          </p>
        </div>

        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-rose-400/10 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-xs text-gray-400">CPF Negado</p>
          </div>
          <p className="text-3xl font-bold text-rose-400">{data.totalCpfNegado}</p>
          <p className="text-xs text-gray-500 mt-1">leads finalizados por CPF</p>
        </div>

        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-400/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-gray-400">No-shows</p>
          </div>
          <p className="text-3xl font-bold text-amber-400">{data.totalNoShow}</p>
          <p className="text-xs text-gray-500 mt-1">não compareceram</p>
        </div>
      </div>

      {/* Motivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Não comparecimento */}
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

        {/* Motivos de finalização */}
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
                <BarRow
                  key={m.motivo}
                  label={m.motivo}
                  count={m.count}
                  max={maxFin}
                  color={m.motivo === "CPF negada" ? "bg-rose-400" : "bg-gray-500"}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Oportunidades por Vendedor */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#232a3b] flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Oportunidades por Vendedor
          </h2>
          <span className="ml-auto text-xs text-gray-500">clique no vendedor para ver as oportunidades</span>
        </div>

        {data.porVendedor.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma oportunidade registrada</p>
          </div>
        ) : (
          <div>
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#141820] border-b border-[#232a3b] text-xs font-semibold text-gray-500 uppercase">
              <div className="col-span-4">Vendedor</div>
              <div className="col-span-2 text-center">Oport.</div>
              <div className="col-span-2 text-center">Reuniões</div>
              <div className="col-span-2 text-center">CPF Neg.</div>
              <div className="col-span-2 text-center">Vendas</div>
            </div>

            {data.porVendedor.map((v) => (
              <div key={v.id}>
                {/* Linha do vendedor */}
                <button
                  onClick={() => setExpandido(expandido === v.id ? null : v.id)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#232a3b] hover:bg-[#232a3b]/50 transition text-left"
                >
                  <div className="col-span-4 flex items-center gap-2 font-medium text-sky-400 text-sm">
                    {expandido === v.id
                      ? <ChevronUp className="w-4 h-4 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                    {v.nome}
                  </div>
                  <div className="col-span-2 text-center text-gray-100 font-semibold text-sm">{v.totalOportunidades}</div>
                  <div className="col-span-2 text-center">
                    <span className="text-emerald-400 font-semibold text-sm">{v.reunioesFeitas}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`font-semibold text-sm ${v.cpfNegado > 0 ? "text-rose-400" : "text-gray-500"}`}>
                      {v.cpfNegado}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`font-semibold text-sm ${v.vendas > 0 ? "text-lime-400" : "text-gray-500"}`}>
                      {v.vendas}
                    </span>
                  </div>
                </button>

                {/* Lista expandida de registros */}
                {expandido === v.id && (
                  <div className="border-b border-[#232a3b] bg-[#0b0f19]">
                    {v.registros.length === 0 ? (
                      <p className="px-8 py-4 text-sm text-gray-500">Sem registros</p>
                    ) : (
                      <div className="divide-y divide-[#1a1f2e]">
                        {/* Sub-cabeçalho */}
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
                            : r.motivoFinalizacao
                            ? r.motivoFinalizacao
                            : r.motivoNaoCompareceu
                            ? r.motivoNaoCompareceu
                            : "—";

                          return (
                            <div key={r.id} className="grid grid-cols-12 gap-2 px-8 py-2.5 hover:bg-[#1a1f2e]/50 transition text-sm">
                              <div className="col-span-3 font-medium text-gray-100 truncate">{r.nomeCliente}</div>
                              <div className="col-span-2 text-gray-400">{formatDate(r.dataReuniao)}</div>
                              <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>
                                  {sc.icon}
                                  {sc.label}
                                </span>
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
    </div>
  );
}

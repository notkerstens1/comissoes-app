"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { OperacaoNav } from "@/components/OperacaoNav";
import { Filter, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { canAccessTecnico } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { getLabelInstalacao } from "@/lib/setor-tecnico";

interface CardMaterial {
  id: string;
  nomeCliente: string;
  codigoLocalizador: string | null;
  vendedorNome: string | null;
  createdAt: string;
  etapaInstalacao: string;
  custoMaterialReal: number | null;
  statusMaterial: "VERDE" | "AMARELO" | "VERMELHO" | null;
  venda: { cliente: string; valorVenda: number; cidadeInstalacao: string | null } | null;
}

interface Resumo {
  total: number;
  comCusto: number;
  verde: number;
  amarelo: number;
  vermelho: number;
  padraoUnitario: number;
  totalEstimado: number;
  totalReal: number;
  delta: number;
}

// Janela padrao: ultimos 90 dias (cards sao criados continuamente; mes fechado
// deixava a pagina vazia). Pedro ajusta o periodo no filtro.
function getRangePadrao() {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { start, end };
}

const statusColors: Record<string, string> = {
  VERDE:    "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  AMARELO:  "bg-amber-500/15 text-amber-300 border-amber-500/40",
  VERMELHO: "bg-red-500/20 text-red-300 border-red-500/60",
};

export default function MargemPage() {
  const { data: session, status } = useSession();
  const initial = getRangePadrao();
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [cards, setCards] = useState<CardMaterial[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const autorizado = status === "authenticated" && canAccessTecnico(session?.user?.role);

  useEffect(() => {
    if (!autorizado) return;
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (filterStatus) params.set("status", filterStatus);
    fetch(`/api/tecnico/margem-instalacoes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCards(d.cards ?? []);
        setResumo(d.resumo ?? null);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, filterStatus, autorizado]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage" />
      </div>
    );
  }
  if (!autorizado) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-liv-danger py-12">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Acesso negado.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação · Setor Técnico"
        title="Margem de Instalação"
        subtitle={`${resumo?.total ?? 0} cards no material · ${resumo?.comCusto ?? 0} com custo lançado`}
        actions={
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink"
            />
            <span className="text-liv-faint text-sm">ate</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-liv-line text-sm bg-liv-surface-2 text-liv-ink"
            />
          </div>
        }
      />

      <div className="max-w-6xl mx-auto space-y-6">
        <OperacaoNav />

        {/* Cards de resumo */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card
              label="Total estimado"
              value={formatCurrency(resumo.totalEstimado)}
              hint={`padrão ${formatCurrency(resumo.padraoUnitario)}/card`}
            />
            <Card label="Total real (CA)" value={formatCurrency(resumo.totalReal)} hint={`${resumo.comCusto} lançados`} />
            <Card
              label="Delta (real - estimado)"
              value={formatCurrency(resumo.delta)}
              hint={resumo.delta > 0 ? "estourou" : "dentro/sobrou"}
              valueClass={resumo.delta > 0 ? "text-liv-danger" : "text-liv-sage"}
            />
            <Card label="Verde / Amarelo / Vermelho" value={`${resumo.verde} / ${resumo.amarelo} / ${resumo.vermelho}`} hint="distribuicao" />
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setFilterStatus("")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              filterStatus === "" ? "bg-liv-teal text-liv-bg" : "bg-liv-surface-2 text-liv-muted"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Todos
          </button>
          {["VERDE", "AMARELO", "VERMELHO"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                filterStatus === s ? statusColors[s] : "bg-liv-surface-2 text-liv-muted border-transparent"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="text-[11px] text-liv-faint ml-auto">
            O custo é lançado no card, na etapa “Material CA Comprado”.
          </span>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center text-liv-faint py-12 bg-liv-surface rounded-xl border border-liv-line">
            Nenhum card no material neste período. O custo aparece aqui quando o Pedro lança no card.
          </div>
        ) : (
          <div className="bg-liv-surface rounded-xl border border-liv-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-liv-surface-2 text-liv-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Etapa</th>
                    <th className="text-right px-4 py-3 font-medium">Estimado</th>
                    <th className="text-right px-4 py-3 font-medium">Real (CA)</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-liv-line">
                  {cards.map((c) => (
                    <tr key={c.id} className="hover:bg-liv-surface-2">
                      <td className="px-4 py-3 font-medium text-liv-ink">
                        {c.nomeCliente}
                        <span className="block text-[10px] text-liv-faint">
                          {c.codigoLocalizador ? `#${c.codigoLocalizador} · ` : ""}
                          {c.vendedorNome ?? "-"} · {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-liv-muted">{getLabelInstalacao(c.etapaInstalacao)}</td>
                      <td className="px-4 py-3 text-right text-liv-faint tabular-nums">
                        {c.custoMaterialReal != null ? formatCurrency(resumo?.padraoUnitario ?? 500) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.custoMaterialReal != null ? (
                          <span className="text-liv-ink font-medium tabular-nums">{formatCurrency(c.custoMaterialReal)}</span>
                        ) : (
                          <span className="text-liv-faint">pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.statusMaterial ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[c.statusMaterial]}`}>
                            {c.statusMaterial}
                          </span>
                        ) : (
                          <span className="text-liv-faint text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, hint, valueClass }: { label: string; value: string; hint: string; valueClass?: string }) {
  return (
    <div className="bg-liv-surface rounded-xl p-4 border border-liv-line">
      <p className="text-xs text-liv-muted">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${valueClass ?? "text-liv-ink"}`}>{value}</p>
      <p className="text-[10px] text-liv-faint mt-1">{hint}</p>
    </div>
  );
}

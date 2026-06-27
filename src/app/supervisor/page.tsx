"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Target, TrendingUp, DollarSign, Calendar, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface Resultado {
  mesReferencia: string;
  metaReceita: number;
  metaVendasQtdTime: number;
  totalVendido: number;
  percentualAtingido: number;
  faixa: "ate_80" | "80_a_100" | "acima_100";
  percentualAplicavel: number;
  comissaoCalculada: number;
  quantidadeVendas: number;
  breakdownVendedores: { nome: string; total: number }[];
  projecao?: {
    diasDecorridos: number;
    diasTotal: number;
    receitaProjetada: number;
    vendasProjetadas: number;
    percentualProjetado: number;
    faixaProjetada: "ate_80" | "80_a_100" | "acima_100";
    comissaoProjetada: number;
  };
}

const faixaLabel: Record<Resultado["faixa"], string> = {
  ate_80: "Abaixo de 80% da meta",
  "80_a_100": "Entre 80% e 100% da meta",
  acima_100: "100% ou mais da meta",
};

const faixaColor: Record<Resultado["faixa"], string> = {
  ate_80: "text-liv-danger",
  "80_a_100": "text-liv-gold",
  acima_100: "text-liv-sage",
};

const faixaBgColor: Record<Resultado["faixa"], string> = {
  ate_80: "bg-liv-danger/10 border-liv-danger/30",
  "80_a_100": "bg-liv-gold/10 border-liv-gold/30",
  acima_100: "bg-liv-sage/10 border-liv-sage/30",
};

function getMesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getNomeMes(mes: string): string {
  const [ano, m] = mes.split("-");
  const meses = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[parseInt(m) - 1]} ${ano}`;
}

export default function SupervisorPage() {
  const [mes, setMes] = useState(getMesAtual());
  const [dados, setDados] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/supervisor/comissao?mes=${mes}`)
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false));
  }, [mes]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação · Supervisor"
        title="Comissão do Supervisor"
        subtitle={getNomeMes(mes)}
        actions={
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-liv-line bg-liv-surface-2 px-3 py-2 text-sm text-liv-ink"
          />
        }
      />

      {loading || !dados ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liv-sage"></div>
        </div>
      ) : (
        <>
          {/* Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              icon={<Target className="w-5 h-5 text-liv-violet" />}
              label="Meta de vendas (time)"
              value={`${dados.metaVendasQtdTime} vendas`}
              hint="qtd no mês — base da faixa do supervisor"
            />
            <Card
              icon={<DollarSign className="w-5 h-5 text-liv-sage" />}
              label="Receita realizada"
              value={formatCurrency(dados.totalVendido)}
              hint={`${dados.quantidadeVendas} venda${dados.quantidadeVendas === 1 ? "" : "s"} — base da comissão (R$)`}
            />
            <Card
              icon={<TrendingUp className={`w-5 h-5 ${faixaColor[dados.faixa]}`} />}
              label="% da meta atingido"
              value={`${(dados.percentualAtingido * 100).toFixed(1)}%`}
              hint={faixaLabel[dados.faixa]}
              valueClass={faixaColor[dados.faixa]}
            />
            <Card
              icon={<DollarSign className="w-5 h-5 text-liv-gold" />}
              label="Comissao calculada"
              value={formatCurrency(dados.comissaoCalculada)}
              hint={`${(dados.percentualAplicavel * 100).toFixed(2)}% sobre receita`}
              valueClass="text-liv-gold"
            />
          </div>

          {/* Faixa de progresso */}
          <div className={`rounded-2xl border p-6 ${faixaBgColor[dados.faixa]}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-liv-muted">Progresso da meta</p>
              <p className={`text-sm font-bold tabular-nums ${faixaColor[dados.faixa]}`}>
                {(dados.percentualAtingido * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-full bg-liv-surface-2 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  dados.faixa === "acima_100" ? "bg-liv-sage"
                    : dados.faixa === "80_a_100" ? "bg-liv-gold"
                    : "bg-liv-danger"
                }`}
                style={{ width: `${Math.min(dados.percentualAtingido * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-liv-faint mt-2 tabular-nums">
              <span>0</span>
              <span>80%: {Math.round(dados.metaVendasQtdTime * 0.8)} vendas</span>
              <span>{dados.metaVendasQtdTime} vendas</span>
            </div>
          </div>

          {/* Projecao (mes corrente) */}
          {dados.projecao && (
            <div className="bg-liv-surface rounded-2xl border border-liv-line p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-liv-info" />
                <h2 className="font-semibold text-liv-ink">Projecao para o fim do mes</h2>
                <span className="text-xs text-liv-faint ml-auto tabular-nums">
                  {dados.projecao.diasDecorridos} de {dados.projecao.diasTotal} dias decorridos
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-liv-muted">Receita projetada</p>
                  <p className="text-xl font-bold tabular-nums text-liv-ink mt-1">
                    {formatCurrency(dados.projecao.receitaProjetada)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-liv-muted">% projetado da meta</p>
                  <p className={`text-xl font-bold mt-1 tabular-nums ${faixaColor[dados.projecao.faixaProjetada]}`}>
                    {(dados.projecao.percentualProjetado * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-liv-muted">Comissao projetada</p>
                  <p className="text-xl font-bold tabular-nums text-liv-gold mt-1">
                    {formatCurrency(dados.projecao.comissaoProjetada)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown por vendedor */}
          <div className="bg-liv-surface rounded-2xl border border-liv-line overflow-hidden">
            <div className="px-6 py-4 border-b border-liv-line flex items-center gap-2">
              <Users className="w-5 h-5 text-liv-muted" />
              <h2 className="font-semibold text-liv-ink">Receita por vendedor</h2>
            </div>
            {dados.breakdownVendedores.length === 0 ? (
              <p className="p-6 text-liv-muted text-center">Nenhuma venda neste mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-liv-surface-2 text-liv-faint">
                    <tr>
                      <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Vendedor</th>
                      <th className="text-right px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">Receita</th>
                      <th className="text-right px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em]">% do total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-liv-line">
                    {dados.breakdownVendedores.map((v) => (
                      <tr key={v.nome} className="hover:bg-liv-surface-2">
                        <td className="px-6 py-3 font-medium text-liv-ink">{v.nome}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-liv-muted">{formatCurrency(v.total)}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-liv-faint">
                          {dados.totalVendido > 0
                            ? ((v.total / dados.totalVendido) * 100).toFixed(1)
                            : "0.0"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-liv-sage/5 font-semibold">
                    <tr>
                      <td className="px-6 py-3 text-liv-sage">Total</td>
                      <td className="px-6 py-3 text-right tabular-nums text-liv-sage">
                        {formatCurrency(dados.totalVendido)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-liv-sage">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  icon, label, value, hint, valueClass,
}: { icon: React.ReactNode; label: string; value: string; hint: string; valueClass?: string }) {
  return (
    <div className="bg-liv-surface rounded-2xl p-5 border border-liv-line">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-liv-muted">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueClass ?? "text-liv-ink"}`}>{value}</p>
      <p className="text-xs text-liv-faint mt-1">{hint}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Target, TrendingUp, DollarSign, Calendar, Users } from "lucide-react";

interface Resultado {
  mesReferencia: string;
  metaReceita: number;
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
  ate_80: "text-red-400",
  "80_a_100": "text-amber-400",
  acima_100: "text-lime-400",
};

const faixaBgColor: Record<Resultado["faixa"], string> = {
  ate_80: "bg-red-400/10 border-red-400/30",
  "80_a_100": "bg-amber-400/10 border-amber-400/30",
  acima_100: "bg-lime-400/10 border-lime-400/30",
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Comissao do Supervisor</h1>
          <p className="text-gray-400">{getNomeMes(mes)}</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
        />
      </div>

      {loading || !dados ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-400"></div>
        </div>
      ) : (
        <>
          {/* Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              icon={<Target className="w-5 h-5 text-purple-400" />}
              label="Meta de receita"
              value={formatCurrency(dados.metaReceita)}
              hint="meta mensal da empresa"
            />
            <Card
              icon={<DollarSign className="w-5 h-5 text-lime-400" />}
              label="Receita realizada"
              value={formatCurrency(dados.totalVendido)}
              hint={`${dados.quantidadeVendas} venda${dados.quantidadeVendas === 1 ? "" : "s"}`}
            />
            <Card
              icon={<TrendingUp className={`w-5 h-5 ${faixaColor[dados.faixa]}`} />}
              label="% da meta atingido"
              value={`${(dados.percentualAtingido * 100).toFixed(1)}%`}
              hint={faixaLabel[dados.faixa]}
              valueClass={faixaColor[dados.faixa]}
            />
            <Card
              icon={<DollarSign className="w-5 h-5 text-amber-400" />}
              label="Comissao calculada"
              value={formatCurrency(dados.comissaoCalculada)}
              hint={`${(dados.percentualAplicavel * 100).toFixed(2)}% sobre receita`}
              valueClass="text-amber-400"
            />
          </div>

          {/* Faixa de progresso */}
          <div className={`rounded-xl border p-6 ${faixaBgColor[dados.faixa]}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-300">Progresso da meta</p>
              <p className={`text-sm font-bold ${faixaColor[dados.faixa]}`}>
                {(dados.percentualAtingido * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-full bg-[#0b0f19] rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  dados.faixa === "acima_100" ? "bg-lime-400"
                    : dados.faixa === "80_a_100" ? "bg-amber-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${Math.min(dados.percentualAtingido * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>R$ 0</span>
              <span>80%: {formatCurrency(dados.metaReceita * 0.8)}</span>
              <span>{formatCurrency(dados.metaReceita)}</span>
            </div>
          </div>

          {/* Projecao (mes corrente) */}
          {dados.projecao && (
            <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-gray-100">Projecao para o fim do mes</h2>
                <span className="text-xs text-gray-500 ml-auto">
                  {dados.projecao.diasDecorridos} de {dados.projecao.diasTotal} dias decorridos
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Receita projetada</p>
                  <p className="text-xl font-bold text-gray-100 mt-1">
                    {formatCurrency(dados.projecao.receitaProjetada)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">% projetado da meta</p>
                  <p className={`text-xl font-bold mt-1 ${faixaColor[dados.projecao.faixaProjetada]}`}>
                    {(dados.projecao.percentualProjetado * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Comissao projetada</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {formatCurrency(dados.projecao.comissaoProjetada)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown por vendedor */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#232a3b] flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-100">Receita por vendedor</h2>
            </div>
            {dados.breakdownVendedores.length === 0 ? (
              <p className="p-6 text-gray-400 text-center">Nenhuma venda neste mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#141820] text-gray-400">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">Vendedor</th>
                      <th className="text-right px-6 py-3 font-medium">Receita</th>
                      <th className="text-right px-6 py-3 font-medium">% do total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232a3b]">
                    {dados.breakdownVendedores.map((v) => (
                      <tr key={v.nome} className="hover:bg-[#232a3b]">
                        <td className="px-6 py-3 font-medium text-gray-100">{v.nome}</td>
                        <td className="px-6 py-3 text-right text-gray-300">{formatCurrency(v.total)}</td>
                        <td className="px-6 py-3 text-right text-gray-500">
                          {dados.totalVendido > 0
                            ? ((v.total / dados.totalVendido) * 100).toFixed(1)
                            : "0.0"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-lime-400/5 font-semibold">
                    <tr>
                      <td className="px-6 py-3 text-lime-400">Total</td>
                      <td className="px-6 py-3 text-right text-lime-400">
                        {formatCurrency(dados.totalVendido)}
                      </td>
                      <td className="px-6 py-3 text-right text-lime-400">100%</td>
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
    <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${valueClass ?? "text-gray-100"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}

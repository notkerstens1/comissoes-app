"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  CANAL_COLOR,
  CANAL_LABEL,
  type CROOverview,
  type CanalKey,
} from "./types";

interface Props {
  canais: CROOverview["canais"];
  comparacao: CROOverview["comparacaoMesAnterior"];
  externoBreakdown: CROOverview["externoBreakdown"];
  totalReceita: number;
}

const CANAIS_ORDEM: CanalKey[] = ["trafego", "indicacao", "externoDaniel", "naoClassificado"];

function DeltaBadge({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  const positivo = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positivo ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {positivo ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function CanaisOverview({ canais, comparacao, externoBreakdown, totalReceita }: Props) {
  const dadosPizza = CANAIS_ORDEM
    .filter((k) => canais[k].vendas > 0)
    .map((k) => ({
      key: k,
      name: CANAL_LABEL[k],
      value: canais[k].receita,
      color: CANAL_COLOR[k],
    }));

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Representatividade por canal</h3>
        <p className="text-xs text-gray-400">Receita total: {formatCurrency(totalReceita)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza */}
        <div className="relative h-64">
          {dadosPizza.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Sem vendas no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {dadosPizza.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#141820",
                    border: "1px solid #232a3b",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value) => formatCurrency(typeof value === "number" ? value : 0)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase tracking-wider">
              <tr className="border-b border-[#232a3b]">
                <th className="py-2 text-left font-medium">Canal</th>
                <th className="py-2 text-right font-medium">Vendas</th>
                <th className="py-2 text-right font-medium">Receita</th>
                <th className="py-2 text-right font-medium">%</th>
                <th className="py-2 text-right font-medium">vs mês ant.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232a3b]">
              {CANAIS_ORDEM.map((k) => {
                const c = canais[k];
                const isExterno = k === "externoDaniel";
                const cmp = k !== "naoClassificado" ? comparacao[k] : null;
                return (
                  <tr key={k} className={c.vendas === 0 ? "opacity-50" : ""}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ background: CANAL_COLOR[k] }}
                        />
                        <span className="text-gray-100 text-xs">{CANAL_LABEL[k]}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-gray-100">{c.vendas}</td>
                    <td className="py-2.5 text-right text-gray-100">{formatCurrency(c.receita)}</td>
                    <td className="py-2.5 text-right text-gray-400">{c.percentualReceita.toFixed(0)}%</td>
                    <td className="py-2.5 text-right">
                      {cmp ? <DeltaBadge pct={cmp.receitaDeltaPct} /> : <span className="text-xs text-gray-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {canais.externoDaniel.vendas > 0 && (
            <div className="mt-3 pt-3 border-t border-[#232a3b] text-xs text-gray-500">
              <span className="text-gray-400">Externo Daniel detalhado:</span>{" "}
              {externoBreakdown.trafego} originadas em tráfego ·{" "}
              {externoBreakdown.indicacao} em indicação
              {externoBreakdown.semFonte > 0 && ` · ${externoBreakdown.semFonte} sem fonte`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

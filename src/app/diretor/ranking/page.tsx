"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Trophy, Medal, Crown, Edit2, Target, Save } from "lucide-react";

interface VendedorRanking {
  posicao: number;
  id: string;
  nome: string;
  email: string;
  totalVendido: number;
  quantidadeVendas: number;
  comissaoTotal: number;
  margemMedia: number;
  lucroTotal: number;
  margemLucroMedia: number;
  ticketMedio: number;
  progressoMeta: number;
}

interface MetaInfo {
  metaVendasMes: number;
  metaMargemMedia: number;
  metaTime: number;
  progressoTime: number;
  qtdVendedores: number;
}

interface DadosRanking {
  mes: string;
  ranking: VendedorRanking[];
  totais: {
    totalGeralVendido: number;
    totalGeralComissao: number;
    totalGeralVendas: number;
  };
  meta: MetaInfo;
}

export default function RankingPage() {
  const router = useRouter();
  const [dados, setDados] = useState<DadosRanking | null>(null);
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [ordenarPor, setOrdenarPor] = useState<string>("totalVendido");

  // Meta editavel
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("");
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  useEffect(() => {
    fetchDados();
  }, [mesAtual]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diretor/ranking?mes=${mesAtual}`);
      const data = await res.json();
      setDados(data);
      if (data.meta) {
        setMetaInput(String(data.meta.metaVendasMes));
      }
    } catch (error) {
      console.error("Erro ao carregar ranking:", error);
    }
    setLoading(false);
  };

  const salvarMeta = async () => {
    const valor = parseFloat(metaInput);
    if (isNaN(valor) || valor <= 0) return;
    setSalvandoMeta(true);
    try {
      await fetch("/api/diretor/ranking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaVendasMes: valor }),
      });
      setEditandoMeta(false);
      fetchDados();
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
    }
    setSalvandoMeta(false);
  };

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  const getPosicaoIcon = (pos: number) => {
    if (pos === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (pos === 2) return <Medal className="w-5 h-5 text-gray-500" />;
    if (pos === 3) return <Medal className="w-5 h-5 text-amber-400" />;
    return <span className="text-sm font-bold text-gray-500">{pos}</span>;
  };

  const getPosicaoBg = (pos: number) => {
    if (pos === 1) return "bg-yellow-400/10 border-yellow-400/20";
    if (pos === 2) return "bg-[#141820] border-[#232a3b]";
    if (pos === 3) return "bg-amber-400/10 border-amber-400/20";
    return "bg-[#1a1f2e] border-[#232a3b]";
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return "bg-lime-400";
    if (pct >= 50) return "bg-amber-400";
    return "bg-red-400";
  };

  const getProgressTextColor = (pct: number) => {
    if (pct >= 100) return "text-lime-400";
    if (pct >= 50) return "text-amber-400";
    return "text-red-400";
  };

  // Ordenar ranking
  const rankingOrdenado = dados?.ranking ? [...dados.ranking].sort((a, b) => {
    const key = ordenarPor as keyof VendedorRanking;
    return (b[key] as number) - (a[key] as number);
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  const meta = dados?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Ranking de Vendedores
          </h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
          >
            <option value="totalVendido">Total Vendido</option>
            <option value="quantidadeVendas">Qtd Vendas</option>
            <option value="comissaoTotal">Comissao</option>
            <option value="margemMedia">Margem Media</option>
            <option value="lucroTotal">Lucro Total</option>
          </select>
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#232a3b] text-sm bg-[#141820] text-gray-100"
          />
        </div>
      </div>

      {/* Meta do Time */}
      {meta && (
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-gray-100">Meta do Time</h2>
            </div>
            {!editandoMeta ? (
              <button
                onClick={() => setEditandoMeta(true)}
                className="text-xs text-gray-400 hover:text-amber-400 transition flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Editar meta
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Meta/vendedor: R$</span>
                <input
                  type="number"
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                  className="w-28 px-2 py-1 rounded border border-amber-400/30 text-sm bg-[#0d1117] text-gray-100"
                />
                <button
                  onClick={salvarMeta}
                  disabled={salvandoMeta}
                  className="px-2 py-1 rounded bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" /> Salvar
                </button>
                <button
                  onClick={() => setEditandoMeta(false)}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Barra do time */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {formatCurrency(dados?.totais?.totalGeralVendido || 0)} de {formatCurrency(meta.metaTime)}
                <span className="text-gray-500 ml-1">({meta.qtdVendedores} vendedores x {formatCurrency(meta.metaVendasMes)})</span>
              </span>
              <span className={`font-bold ${getProgressTextColor(meta.progressoTime)}`}>
                {meta.progressoTime.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-3 bg-[#232a3b] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getProgressColor(meta.progressoTime)}`}
                style={{ width: `${Math.min(meta.progressoTime, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Totais do time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <p className="text-sm text-gray-400">Total Vendido (Time)</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{formatCurrency(dados?.totais?.totalGeralVendido || 0)}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <p className="text-sm text-gray-400">Total Comissoes</p>
          <p className="text-2xl font-bold text-lime-400 mt-1">{formatCurrency(dados?.totais?.totalGeralComissao || 0)}</p>
        </div>
        <div className="bg-[#1a1f2e] rounded-xl p-5 shadow-sm border border-[#232a3b]">
          <p className="text-sm text-gray-400">Total Vendas</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{dados?.totais?.totalGeralVendas || 0}</p>
        </div>
      </div>

      {/* Cards do Ranking */}
      <div className="space-y-3">
        {rankingOrdenado.map((v, idx) => (
          <div
            key={v.id}
            className={`rounded-xl p-5 shadow-sm border ${getPosicaoBg(idx + 1)} transition hover:shadow-md`}
          >
            <div className="flex items-center gap-4">
              {/* Posicao */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1a1f2e] shadow-sm">
                {getPosicaoIcon(idx + 1)}
              </div>

              {/* Info do vendedor */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-100 text-lg">{v.nome}</h3>
                <p className="text-xs text-gray-400">{v.email}</p>
              </div>

              {/* Metricas */}
              <div className="hidden sm:grid grid-cols-5 gap-6 text-center">
                <div>
                  <p className="text-xs text-gray-400">Vendido</p>
                  <p className="font-bold text-gray-100">{formatCurrency(v.totalVendido)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Vendas</p>
                  <p className="font-bold text-gray-100">{v.quantidadeVendas}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Comissao</p>
                  <p className="font-bold text-lime-400">{formatCurrency(v.comissaoTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Margem Venda</p>
                  <p className="font-bold text-gray-100">{formatNumber(v.margemMedia)}x</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Lucro</p>
                  <p className={`font-bold ${v.lucroTotal >= 0 ? "text-lime-400" : "text-red-400"}`}>
                    {formatCurrency(v.lucroTotal)}
                  </p>
                </div>
              </div>

              {/* Botao Editar */}
              <button
                onClick={() => {
                  const url = `/diretor/custos?mes=${mesAtual}&vendedor=${v.id}`;
                  router.push(url);
                }}
                className="ml-4 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium transition flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar Vendas</span>
                <span className="sm:hidden">Editar</span>
              </button>
            </div>

            {/* Barra de progresso da meta individual */}
            {meta && (
              <div className="mt-3 pt-3 border-t border-[#232a3b]/50">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">
                    Meta: {formatCurrency(v.totalVendido)} / {formatCurrency(meta.metaVendasMes)}
                  </span>
                  <span className={`font-bold ${getProgressTextColor(v.progressoMeta)}`}>
                    {v.progressoMeta.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#232a3b] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getProgressColor(v.progressoMeta)}`}
                    style={{ width: `${Math.min(v.progressoMeta, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Mobile: metricas em grid */}
            <div className="sm:hidden grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#232a3b]/50">
              <div>
                <p className="text-xs text-gray-400">Vendido</p>
                <p className="font-bold text-sm text-gray-100">{formatCurrency(v.totalVendido)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Comissao</p>
                <p className="font-bold text-sm text-lime-400">{formatCurrency(v.comissaoTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Lucro</p>
                <p className={`font-bold text-sm ${v.lucroTotal >= 0 ? "text-lime-400" : "text-red-400"}`}>
                  {formatCurrency(v.lucroTotal)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {rankingOrdenado.length === 0 && (
          <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhum vendedor com vendas</h3>
            <p className="text-gray-400">Aguardando registro de vendas neste periodo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

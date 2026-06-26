"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Trophy, Edit2, Target, Save } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  const getProgressTone = (pct: number): "gold" | "amber" | "sage" => {
    if (pct >= 100) return "gold";
    if (pct >= 50) return "amber";
    return "sage";
  };

  const getProgressTextColor = (pct: number) => {
    if (pct >= 100) return "text-liv-gold";
    if (pct >= 50) return "text-liv-gold/70";
    return "text-liv-danger";
  };

  const getAvatarTone = (pos: number): "gold" | "neutral" => {
    if (pos === 1) return "gold";
    return "neutral";
  };

  // Ordenar ranking
  const rankingOrdenado = dados?.ranking ? [...dados.ranking].sort((a, b) => {
    const key = ordenarPor as keyof VendedorRanking;
    return (b[key] as number) - (a[key] as number);
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-gold"></div>
      </div>
    );
  }

  const meta = dados?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Diretoria"
        title="Ranking de Vendedores"
        subtitle={getNomeMes(mesAtual)}
        actions={
          <>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-liv-line text-sm bg-liv-surface text-liv-ink focus:outline-none focus:ring-2 focus:ring-liv-gold/40"
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
              className="h-9 px-3 rounded-md border border-liv-line text-sm bg-liv-surface text-liv-ink focus:outline-none focus:ring-2 focus:ring-liv-gold/40"
            />
          </>
        }
      />

      {/* Meta do Time */}
      {meta && (
        <Card className="bg-liv-surface border-liv-line">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-liv-gold" />
                <h2 className="font-semibold text-liv-ink">Meta do Time</h2>
              </div>
              {!editandoMeta ? (
                <button
                  onClick={() => setEditandoMeta(true)}
                  className="flex items-center gap-1 text-xs text-liv-faint hover:text-liv-gold transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Editar meta
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-liv-faint">Meta/vendedor: R$</span>
                  <input
                    type="number"
                    value={metaInput}
                    onChange={(e) => setMetaInput(e.target.value)}
                    className="w-28 h-7 px-2 rounded border border-liv-gold/30 text-sm bg-liv-surface-2 text-liv-ink focus:outline-none focus:ring-1 focus:ring-liv-gold/40"
                  />
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={salvarMeta}
                    disabled={salvandoMeta}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Save className="w-3 h-3" /> Salvar
                  </Button>
                  <button
                    onClick={() => setEditandoMeta(false)}
                    className="text-xs text-liv-faint hover:text-liv-muted"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Barra do time */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-liv-muted">
                  {formatCurrency(dados?.totais?.totalGeralVendido || 0)} de {formatCurrency(meta.metaTime)}
                  <span className="text-liv-faint ml-1">
                    ({meta.qtdVendedores} vendedores x {formatCurrency(meta.metaVendasMes)})
                  </span>
                </span>
                <span className={`font-bold tabular-nums ${getProgressTextColor(meta.progressoTime)}`}>
                  {meta.progressoTime.toFixed(0)}%
                </span>
              </div>
              <ProgressBar
                value={meta.progressoTime}
                max={100}
                tone={getProgressTone(meta.progressoTime)}
                height={10}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totais do time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-liv-surface border-liv-line">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-liv-faint uppercase tracking-wide font-medium">Total Vendido (Time)</p>
            <p className="text-2xl font-bold text-liv-ink mt-1 tabular-nums">
              {formatCurrency(dados?.totais?.totalGeralVendido || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-liv-surface border-liv-line">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-liv-faint uppercase tracking-wide font-medium">Total Comissoes</p>
            <p className="text-2xl font-bold text-liv-sage mt-1 tabular-nums">
              {formatCurrency(dados?.totais?.totalGeralComissao || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-liv-surface border-liv-line">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-liv-faint uppercase tracking-wide font-medium">Total Vendas</p>
            <p className="text-2xl font-bold text-liv-info mt-1 tabular-nums">
              {dados?.totais?.totalGeralVendas || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards do Ranking */}
      <div className="space-y-3">
        {rankingOrdenado.map((v, idx) => {
          const pos = idx + 1;
          const avatarTone = getAvatarTone(pos);
          const isTop3 = pos <= 3;
          return (
            <Card
              key={v.id}
              className={`border transition-shadow hover:shadow-md ${
                pos === 1
                  ? "bg-liv-gold/5 border-liv-gold/25"
                  : pos === 3
                  ? "bg-liv-surface border-liv-gold/15"
                  : "bg-liv-surface border-liv-line"
              }`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  {/* Avatar com posicao / medalha / crown */}
                  <Avatar
                    name={v.nome}
                    rank={isTop3 ? pos : undefined}
                    tone={avatarTone}
                    size={44}
                  />

                  {/* Info do vendedor */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-liv-ink text-base leading-tight truncate">{v.nome}</h3>
                      {pos <= 3 && (
                        <Badge variant={pos === 1 ? "gold" : "sage"} className="shrink-0">
                          #{pos}
                        </Badge>
                      )}
                      {pos > 3 && (
                        <span className="text-xs font-bold text-liv-faint tabular-nums shrink-0">#{pos}</span>
                      )}
                    </div>
                    <p className="text-xs text-liv-faint truncate mt-0.5">{v.email}</p>
                  </div>

                  {/* Metricas — desktop */}
                  <div className="hidden sm:grid grid-cols-5 gap-6 text-center">
                    <div>
                      <p className="text-xs text-liv-faint mb-0.5">Vendido</p>
                      <p className="font-bold text-liv-ink text-sm tabular-nums">{formatCurrency(v.totalVendido)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-liv-faint mb-0.5">Vendas</p>
                      <p className="font-bold text-liv-ink text-sm tabular-nums">{v.quantidadeVendas}</p>
                    </div>
                    <div>
                      <p className="text-xs text-liv-faint mb-0.5">Comissao</p>
                      <p className="font-bold text-liv-sage text-sm tabular-nums">{formatCurrency(v.comissaoTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-liv-faint mb-0.5">Margem Venda</p>
                      <p className="font-bold text-liv-ink text-sm tabular-nums">{formatNumber(v.margemMedia)}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-liv-faint mb-0.5">Lucro</p>
                      <p className={`font-bold text-sm tabular-nums ${v.lucroTotal >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                        {formatCurrency(v.lucroTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Botao Editar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `/diretor/custos?mes=${mesAtual}&vendedor=${v.id}`;
                      router.push(url);
                    }}
                    className="ml-2 border-liv-line text-liv-muted hover:text-liv-gold hover:border-liv-gold/40 gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar Vendas</span>
                    <span className="sm:hidden">Editar</span>
                  </Button>
                </div>

                {/* Barra de progresso da meta individual */}
                {meta && (
                  <div className="mt-3 pt-3 border-t border-liv-line/50">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-liv-faint">
                        Meta: {formatCurrency(v.totalVendido)} / {formatCurrency(meta.metaVendasMes)}
                      </span>
                      <span className={`font-bold tabular-nums ${getProgressTextColor(v.progressoMeta)}`}>
                        {v.progressoMeta.toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={v.progressoMeta}
                      max={100}
                      tone={getProgressTone(v.progressoMeta)}
                      height={6}
                    />
                  </div>
                )}

                {/* Mobile: metricas em grid */}
                <div className="sm:hidden grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-liv-line/50">
                  <div>
                    <p className="text-xs text-liv-faint">Vendido</p>
                    <p className="font-bold text-sm text-liv-ink tabular-nums">{formatCurrency(v.totalVendido)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Comissao</p>
                    <p className="font-bold text-sm text-liv-sage tabular-nums">{formatCurrency(v.comissaoTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Lucro</p>
                    <p className={`font-bold text-sm tabular-nums ${v.lucroTotal >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                      {formatCurrency(v.lucroTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {rankingOrdenado.length === 0 && (
          <Card className="bg-liv-surface border-liv-line">
            <CardContent className="py-16 text-center">
              <Trophy className="w-12 h-12 text-liv-faint mx-auto mb-4" />
              <h3 className="text-base font-medium text-liv-ink mb-2">Nenhum vendedor com vendas</h3>
              <p className="text-sm text-liv-muted">Aguardando registro de vendas neste periodo.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

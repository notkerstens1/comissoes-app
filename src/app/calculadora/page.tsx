"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  Info,
  Save,
  Trash2,
  History,
} from "lucide-react";
import { formatCurrency, handleCurrencyKeyInput } from "@/lib/utils";
import { calcularMargem, calcularOver, calcularGeracaoKwh } from "@/lib/comissao";

interface ConfigData {
  fatorMultiplicador: number;
  fatorGeracao: number;
  percentualComissaoVenda: number;
  custoPlacaInstalacao: number;
  custoInversorInstalacao: number;
  custoVisitaTecnicaPadrao: number;
  custoCosernPadrao: number;
  custoTrtCreaPadrao: number;
  custoEngenheiroPadrao: number;
  custoMaterialCAPadrao: number;
  aliquotaImpostoPadrao: number;
}

interface Simulacao {
  id: string;
  valorVenda: number;
  custoEquipamentos: number;
  kwp: number;
  quantidadePlacas: number;
  quantidadeInversores: number;
  ehExcecao: boolean;
  margemVendedor: number;
  over: number;
  lucroLiquido: number;
  margemEmpresa: number;
  custoTotal: number;
  vendaSaudavel: boolean;
  createdAt: string;
}

export default function CalculadoraPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Campos de entrada
  const [valorVendaRaw, setValorVendaRaw] = useState("");
  const [valorVenda, setValorVenda] = useState(0);
  const [custoEquipRaw, setCustoEquipRaw] = useState("");
  const [custoEquip, setCustoEquip] = useState(0);
  const [kwp, setKwp] = useState("");
  const [placas, setPlacas] = useState("");
  const [inversores, setInversores] = useState("1");
  const [ehExcecao, setEhExcecao] = useState(false);

  const mesAtual = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const fetchConfig = useCallback(() => {
    fetch("/api/admin/configuracoes")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchSimulacoes = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = await fetch(`/api/calculadora/simulacoes?mes=${mesAtual}`);
      const data = await res.json();
      setSimulacoes(Array.isArray(data) ? data : []);
    } finally {
      setLoadingHist(false);
    }
  }, [mesAtual]);

  useEffect(() => {
    fetchConfig();
    fetchSimulacoes();
  }, [fetchConfig, fetchSimulacoes]);

  const handleCurrency = (
    rawValue: string,
    setRaw: (v: string) => void,
    setNumeric: (v: number) => void
  ) => {
    if (rawValue === "") {
      setRaw("");
      setNumeric(0);
      return;
    }
    const { display, numericValue } = handleCurrencyKeyInput(rawValue);
    setRaw(display);
    setNumeric(numericValue);
  };

  // Calcular resultado (margem auto)
  const resultado = useMemo(() => {
    if (!config || valorVenda <= 0 || custoEquip <= 0) return null;

    const nPlacas = parseInt(placas) || 0;
    const nInversores = parseInt(inversores) || 1;
    const nKwp = parseFloat(kwp) || 0;

    // Threshold depende se é exceção ou não
    const threshold = ehExcecao ? 1.65 : 1.80;

    // Margem do vendedor (calculada automaticamente dos valores inseridos)
    const margem = calcularMargem(valorVenda, custoEquip);
    const margemOk = margem >= threshold;

    // Over (só pago se atingir threshold)
    const over = margemOk
      ? calcularOver(valorVenda, custoEquip, config.fatorMultiplicador)
      : 0;

    // Geracao
    const geracao = calcularGeracaoKwh(nKwp, config.fatorGeracao);

    // Custos individuais
    const custoInstalacao =
      nPlacas * config.custoPlacaInstalacao +
      nInversores * config.custoInversorInstalacao;
    const custoVisitaTecnica = config.custoVisitaTecnicaPadrao;
    const custoCosern = config.custoCosernPadrao;
    const custoTrtCrea = config.custoTrtCreaPadrao;
    const custoEngenheiro = config.custoEngenheiroPadrao;
    const custoMaterialCA = config.custoMaterialCAPadrao;
    const valorServico = Math.max(valorVenda - custoEquip, 0);
    const custoImposto = valorServico * config.aliquotaImpostoPadrao;
    const comissaoVendedor = valorVenda * config.percentualComissaoVenda;

    // Total
    const custoTotalOperacional =
      custoEquip +
      custoInstalacao +
      custoVisitaTecnica +
      custoCosern +
      custoTrtCrea +
      custoEngenheiro +
      custoMaterialCA +
      custoImposto +
      comissaoVendedor;

    const lucroLiquido = valorVenda - custoTotalOperacional;
    const margemEmpresa = valorVenda > 0 ? lucroLiquido / valorVenda : 0;
    const vendaSaudavel = margemEmpresa >= 0.20;

    return {
      margem,
      margemOk,
      threshold,
      over,
      geracao,
      custoInstalacao,
      custoVisitaTecnica,
      custoCosern,
      custoTrtCrea,
      custoEngenheiro,
      custoMaterialCA,
      custoImposto,
      comissaoVendedor,
      custoTotalOperacional,
      lucroLiquido,
      margemEmpresa,
      vendaSaudavel,
    };
  }, [config, valorVenda, custoEquip, kwp, placas, inversores, ehExcecao]);

  async function salvarSimulacao() {
    if (!resultado) return;
    setSaving(true);
    try {
      await fetch("/api/calculadora/simulacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorVenda,
          custoEquipamentos: custoEquip,
          kwp: parseFloat(kwp) || 0,
          quantidadePlacas: parseInt(placas) || 0,
          quantidadeInversores: parseInt(inversores) || 1,
          ehExcecao,
          margemVendedor: resultado.margem,
          over: resultado.over,
          lucroLiquido: resultado.lucroLiquido,
          margemEmpresa: resultado.margemEmpresa,
          custoTotal: resultado.custoTotalOperacional,
          vendaSaudavel: resultado.vendaSaudavel,
        }),
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
      fetchSimulacoes();
    } finally {
      setSaving(false);
    }
  }

  async function deletarSimulacao(id: string) {
    await fetch(`/api/calculadora/simulacoes/${id}`, { method: "DELETE" });
    setSimulacoes((prev) => prev.filter((s) => s.id !== id));
  }

  function formatDatetime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
      " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-sage"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Vendas · Calculadora</p>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-liv-ink flex items-center gap-2">
          <Calculator className="w-6 h-6 text-liv-sage" />
          Calculadora de Venda
        </h1>
        <p className="text-liv-muted text-sm mt-1">
          Simule uma venda para verificar se a margem é saudável para a empresa
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-liv-surface rounded-2xl border border-liv-line p-6">
        <h2 className="text-[11px] font-bold text-liv-faint uppercase tracking-[0.12em] mb-4">
          Dados da Venda
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Valor da Venda */}
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">
              Valor da Venda (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valorVendaRaw}
              onChange={(e) =>
                handleCurrency(e.target.value, setValorVendaRaw, setValorVenda)
              }
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>

          {/* Custo Equipamentos */}
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">
              Custo Equipamentos (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={custoEquipRaw}
              onChange={(e) =>
                handleCurrency(e.target.value, setCustoEquipRaw, setCustoEquip)
              }
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>

          {/* kWp */}
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">
              kWp
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={kwp}
              onChange={(e) => setKwp(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="Ex: 4.68"
              autoComplete="off"
            />
          </div>

          {/* Quantidade de Placas */}
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">
              Qtd. Placas
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={placas}
              onChange={(e) => setPlacas(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="Ex: 12"
            />
          </div>

          {/* Quantidade de Inversores */}
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">
              Qtd. Inversores
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={inversores}
              onChange={(e) => setInversores(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="1"
            />
          </div>

          {/* Venda de Exceção */}
          <div className="flex items-center">
            <label
              className={`flex items-center gap-3 cursor-pointer w-full px-4 py-3 rounded-lg border transition ${
                ehExcecao
                  ? "border-liv-gold/40 bg-liv-gold/5"
                  : "border-liv-line bg-liv-surface-2 hover:border-liv-faint"
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition ${
                  ehExcecao
                    ? "bg-liv-gold border-liv-gold"
                    : "border-liv-faint bg-transparent"
                }`}
                onClick={() => setEhExcecao((v) => !v)}
              >
                {ehExcecao && (
                  <svg className="w-3 h-3 text-liv-bg" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div onClick={() => setEhExcecao((v) => !v)}>
                <p className={`text-xs font-semibold ${ehExcecao ? "text-liv-gold" : "text-liv-muted"}`}>
                  Venda de Exceção
                </p>
                <p className="text-[10px] text-liv-faint mt-0.5">
                  Margem mín. 1.65x (máx 2/mês)
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Margem Vendedor */}
            <div className={`rounded-2xl p-5 border ${
              resultado.margemOk
                ? "bg-liv-sage/5 border-liv-sage/30"
                : "bg-liv-danger/5 border-liv-danger/30"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 ${resultado.margemOk ? "text-liv-sage" : "text-liv-danger"}`} />
                <span className="text-xs text-liv-faint uppercase font-semibold">Margem Vendedor</span>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${resultado.margemOk ? "text-liv-sage" : "text-liv-danger"}`}>
                {resultado.margem.toFixed(2)}x
              </p>
              <p className="text-xs text-liv-faint mt-1 tabular-nums">
                Mínimo: {resultado.threshold.toFixed(2)}x
              </p>
            </div>

            {/* Over */}
            <div className="bg-liv-surface rounded-2xl p-5 border border-liv-line">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-liv-gold" />
                <span className="text-xs text-liv-faint uppercase font-semibold">Over</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-liv-ink">
                {formatCurrency(resultado.over)}
              </p>
              <p className="text-xs text-liv-faint mt-1 tabular-nums">
                Geração: {resultado.geracao.toFixed(0)} kWh
              </p>
            </div>

            {/* Lucro Liquido */}
            <div className={`rounded-2xl p-5 border ${
              resultado.lucroLiquido >= 0
                ? "bg-liv-surface border-liv-line"
                : "bg-liv-danger/5 border-liv-danger/30"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {resultado.lucroLiquido >= 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-liv-sage" />
                ) : (
                  <XCircle className="w-4 h-4 text-liv-danger" />
                )}
                <span className="text-xs text-liv-faint uppercase font-semibold">Lucro Líquido</span>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${resultado.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                {formatCurrency(resultado.lucroLiquido)}
              </p>
            </div>

            {/* Margem Empresa */}
            <div className={`rounded-2xl p-5 border ring-2 ${
              resultado.vendaSaudavel
                ? "bg-liv-sage/5 border-liv-sage/30 ring-liv-sage/20"
                : "bg-liv-danger/5 border-liv-danger/30 ring-liv-danger/20"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {resultado.vendaSaudavel ? (
                  <CheckCircle2 className="w-4 h-4 text-liv-sage" />
                ) : (
                  <XCircle className="w-4 h-4 text-liv-danger" />
                )}
                <span className="text-xs text-liv-faint uppercase font-semibold">Margem Empresa</span>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${resultado.vendaSaudavel ? "text-liv-sage" : "text-liv-danger"}`}>
                {(resultado.margemEmpresa * 100).toFixed(1)}%
              </p>
              <p className="text-xs mt-1">
                {resultado.vendaSaudavel ? (
                  <span className="text-liv-sage font-medium">Venda Saudável ✓</span>
                ) : (
                  <span className="text-liv-danger font-medium">Margem Abaixo de 20%</span>
                )}
              </p>
            </div>
          </div>

          {/* Alerta de exceção */}
          {ehExcecao && resultado.margemOk && (
            <div className="flex items-center gap-3 bg-liv-gold/10 border border-liv-gold/30 rounded-2xl px-5 py-3">
              <Info className="w-5 h-5 text-liv-gold shrink-0" />
              <p className="text-sm text-liv-gold">
                Esta venda usa <strong>margem de exceção</strong> (1.65x mínimo).
                Você pode usar no máximo <strong>2 vendas de exceção por mês</strong>.
              </p>
            </div>
          )}

          {/* Alerta margem vendedor abaixo */}
          {!resultado.margemOk && (
            <div className="flex items-center gap-3 bg-liv-danger/10 border border-liv-danger/30 rounded-2xl px-5 py-3">
              <AlertTriangle className="w-5 h-5 text-liv-danger shrink-0" />
              <p className="text-sm text-liv-danger">
                Margem do vendedor ({resultado.margem.toFixed(2)}x) está abaixo do mínimo ({resultado.threshold.toFixed(2)}x).
                Você <strong>não receberá comissão sobre o over</strong> nesta venda.
              </p>
            </div>
          )}

          {/* Tabela detalhada de custos */}
          <div className="bg-liv-surface rounded-2xl border border-liv-line overflow-hidden">
            <div className="px-6 py-4 border-b border-liv-line">
              <h2 className="font-semibold text-liv-ink">Detalhamento de Custos</h2>
            </div>
            <div className="divide-y divide-liv-line">
              <CustoRow label="Equipamentos" valor={custoEquip} tipo="Informado" />
              <CustoRow
                label="Instalação"
                valor={resultado.custoInstalacao}
                tipo={`${parseInt(placas) || 0} placas x R$${config?.custoPlacaInstalacao} + ${parseInt(inversores) || 1} inv x R$${config?.custoInversorInstalacao}`}
              />
              <CustoRow label="Visita Técnica" valor={resultado.custoVisitaTecnica} tipo="Fixo" fixo />
              <CustoRow label="COSERN" valor={resultado.custoCosern} tipo="Fixo" fixo />
              <CustoRow label="TRT/CREA" valor={resultado.custoTrtCrea} tipo="Fixo" fixo />
              <CustoRow label="Material CA" valor={resultado.custoMaterialCA} tipo="Fixo" fixo />
              <CustoRow label="Engenheiro" valor={resultado.custoEngenheiro} tipo="Fixo" fixo />
              <CustoRow
                label={`Imposto (${((config?.aliquotaImpostoPadrao ?? 0.06) * 100).toFixed(0)}%)`}
                valor={resultado.custoImposto}
                tipo="Proporcional"
              />
              <CustoRow
                label={`Comissão (${((config?.percentualComissaoVenda ?? 0.025) * 100).toFixed(1)}%)`}
                valor={resultado.comissaoVendedor}
                tipo="Proporcional"
              />

              {/* Total */}
              <div className="flex items-center justify-between px-6 py-4 bg-liv-surface-2">
                <p className="font-bold text-liv-gold uppercase text-sm">Custo Total Operacional</p>
                <p className="font-bold text-lg tabular-nums text-liv-gold">
                  {formatCurrency(resultado.custoTotalOperacional)}
                </p>
              </div>

              {/* Lucro */}
              <div className="flex items-center justify-between px-6 py-4 bg-liv-surface-2">
                <p className={`font-bold uppercase text-sm ${resultado.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                  Lucro Líquido
                </p>
                <p className={`font-bold text-lg tabular-nums ${resultado.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                  {formatCurrency(resultado.lucroLiquido)}
                </p>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex items-center gap-3">
            <button
              onClick={salvarSimulacao}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-liv-sage text-liv-bg rounded-xl font-semibold text-sm hover:bg-liv-sage-deep disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Simulação"}
            </button>
            {savedMsg && (
              <span className="flex items-center gap-1.5 text-sm text-liv-sage font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Simulação salva!
              </span>
            )}
          </div>
        </>
      )}

      {/* Vazio */}
      {!resultado && (
        <div className="bg-liv-surface rounded-2xl border border-liv-line p-12 text-center">
          <Calculator className="w-12 h-12 text-liv-faint mx-auto mb-4" />
          <h3 className="text-lg font-medium text-liv-ink mb-2">Preencha os dados</h3>
          <p className="text-liv-muted">Insira o valor da venda e custo dos equipamentos para ver a simulação.</p>
        </div>
      )}

      {/* ===================== HISTÓRICO ===================== */}
      <div className="bg-liv-surface rounded-2xl border border-liv-line overflow-hidden">
        <div className="px-6 py-4 border-b border-liv-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-liv-muted" />
            <h2 className="font-semibold text-liv-ink">
              Simulações do Mês
            </h2>
            <span className="text-xs bg-liv-surface-2 text-liv-muted px-2 py-0.5 rounded-full tabular-nums">
              {simulacoes.length}
            </span>
          </div>
        </div>

        {loadingHist ? (
          <div className="p-6 text-center text-liv-faint text-sm">Carregando...</div>
        ) : simulacoes.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-8 h-8 text-liv-faint mx-auto mb-2" />
            <p className="text-liv-faint text-sm">Nenhuma simulação salva este mês</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-liv-line bg-liv-surface-2">
                  <th className="text-left px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">Data</th>
                  <th className="text-right px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">Venda</th>
                  <th className="text-right px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">Equip.</th>
                  <th className="text-right px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">Margem</th>
                  <th className="text-right px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">Lucro</th>
                  <th className="text-right px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">M. Empresa</th>
                  <th className="text-center px-4 py-3 text-[11px] text-liv-faint font-bold uppercase tracking-[0.12em]">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {simulacoes.map((s) => (
                  <tr key={s.id} className="hover:bg-liv-surface-2 transition">
                    <td className="px-4 py-3 text-xs text-liv-muted">
                      {formatDatetime(s.createdAt)}
                      {s.ehExcecao && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-liv-gold/12 text-liv-gold font-semibold">
                          Exceção
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-liv-ink font-medium tabular-nums">
                      {formatCurrency(s.valorVenda)}
                    </td>
                    <td className="px-4 py-3 text-right text-liv-muted tabular-nums">
                      {formatCurrency(s.custoEquipamentos)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold tabular-nums ${s.margemVendedor >= (s.ehExcecao ? 1.65 : 1.80) ? "text-liv-sage" : "text-liv-danger"}`}>
                        {s.margemVendedor.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums ${s.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                        {formatCurrency(s.lucroLiquido)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums ${s.vendaSaudavel ? "text-liv-sage" : "text-liv-danger"}`}>
                        {(s.margemEmpresa * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.vendaSaudavel ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-liv-sage/14 text-liv-sage font-semibold">
                          Saudável
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-liv-danger/12 text-liv-danger font-semibold">
                          Risco
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deletarSimulacao(s.id)}
                        className="p-1.5 rounded text-liv-faint hover:text-liv-danger hover:bg-liv-danger/10 transition"
                        title="Excluir simulação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CustoRow({
  label,
  valor,
  tipo,
  fixo,
}: {
  label: string;
  valor: number;
  tipo: string;
  fixo?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3 hover:bg-liv-surface-2 transition">
      <div className="flex items-center gap-3">
        <p className="text-sm text-liv-ink font-medium">{label}</p>
        {fixo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-liv-info/12 text-liv-info font-semibold uppercase">
            Fixo
          </span>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums text-liv-ink">{formatCurrency(valor)}</p>
        <p className="text-[10px] text-liv-faint">{tipo}</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  Info,
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

export default function CalculadoraPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos de entrada
  const [valorVendaRaw, setValorVendaRaw] = useState("");
  const [valorVenda, setValorVenda] = useState(0);
  const [custoEquipRaw, setCustoEquipRaw] = useState("");
  const [custoEquip, setCustoEquip] = useState(0);
  const [kwp, setKwp] = useState("");
  const [placas, setPlacas] = useState("");
  const [inversores, setInversores] = useState("1");
  const [margemMinima, setMargemMinima] = useState("1.80");

  useEffect(() => {
    fetch("/api/admin/configuracoes")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  // Calcular resultado
  const resultado = useMemo(() => {
    if (!config || valorVenda <= 0 || custoEquip <= 0) return null;

    const nPlacas = parseInt(placas) || 0;
    const nInversores = parseInt(inversores) || 1;
    const nKwp = parseFloat(kwp) || 0;
    const fatorMinimo = parseFloat(margemMinima) || 1.80;

    // Margem do vendedor
    const margem = calcularMargem(valorVenda, custoEquip);
    const margemOk = margem >= fatorMinimo;
    const ehExcecao = fatorMinimo < 1.80;

    // Over
    const over = margem >= fatorMinimo
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
      ehExcecao,
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
  }, [config, valorVenda, custoEquip, kwp, placas, inversores, margemMinima]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-lime-400" />
          Calculadora de Venda
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Simule uma venda para verificar se a margem e saudavel para a empresa
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-6">
        <h2 className="text-sm font-semibold text-lime-400 uppercase tracking-wider mb-4">
          Dados da Venda
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Valor da Venda */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Valor da Venda (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valorVendaRaw}
              onChange={(e) =>
                handleCurrency(e.target.value, setValorVendaRaw, setValorVenda)
              }
              className="w-full px-3 py-2.5 rounded-lg border border-[#232a3b] focus:border-lime-400 outline-none text-sm bg-[#0b0f19] text-gray-100"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>

          {/* Custo Equipamentos */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Custo Equipamentos (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={custoEquipRaw}
              onChange={(e) =>
                handleCurrency(e.target.value, setCustoEquipRaw, setCustoEquip)
              }
              className="w-full px-3 py-2.5 rounded-lg border border-[#232a3b] focus:border-lime-400 outline-none text-sm bg-[#0b0f19] text-gray-100"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>

          {/* kWp */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              kWp
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={kwp}
              onChange={(e) => setKwp(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#232a3b] focus:border-lime-400 outline-none text-sm bg-[#0b0f19] text-gray-100"
              placeholder="Ex: 4.68"
              autoComplete="off"
            />
          </div>

          {/* Quantidade de Placas */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Qtd. Placas
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={placas}
              onChange={(e) => setPlacas(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#232a3b] focus:border-lime-400 outline-none text-sm bg-[#0b0f19] text-gray-100"
              placeholder="Ex: 12"
            />
          </div>

          {/* Quantidade de Inversores */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Qtd. Inversores
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={inversores}
              onChange={(e) => setInversores(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#232a3b] focus:border-lime-400 outline-none text-sm bg-[#0b0f19] text-gray-100"
              placeholder="1"
            />
          </div>

          {/* Margem Minima */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Margem Minima (fator)
            </label>
            <input
              type="number"
              min="1.65"
              max="1.80"
              step="0.01"
              value={margemMinima}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 1.65 && v <= 1.80) {
                  setMargemMinima(e.target.value);
                } else if (e.target.value === "") {
                  setMargemMinima("");
                } else {
                  setMargemMinima(e.target.value);
                }
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-[#232a3b] focus:border-lime-400 outline-none text-sm bg-[#0b0f19] text-gray-100"
              placeholder="1.80"
            />
            {parseFloat(margemMinima) < 1.80 && parseFloat(margemMinima) >= 1.65 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400">
                  Venda de excecao (max 3/mes)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Margem Vendedor */}
            <div className={`rounded-xl p-5 border ${
              resultado.margemOk
                ? "bg-lime-400/5 border-lime-400/20"
                : "bg-red-400/5 border-red-400/20"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 ${resultado.margemOk ? "text-lime-400" : "text-red-400"}`} />
                <span className="text-xs text-gray-400 uppercase font-semibold">Margem Vendedor</span>
              </div>
              <p className={`text-2xl font-bold ${resultado.margemOk ? "text-lime-400" : "text-red-400"}`}>
                {resultado.margem.toFixed(2)}x
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Minimo: {parseFloat(margemMinima).toFixed(2)}x
              </p>
            </div>

            {/* Over */}
            <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400 uppercase font-semibold">Over</span>
              </div>
              <p className="text-2xl font-bold text-gray-100">
                {formatCurrency(resultado.over)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Geracao: {resultado.geracao.toFixed(0)} kWh
              </p>
            </div>

            {/* Lucro Liquido */}
            <div className={`rounded-xl p-5 border ${
              resultado.lucroLiquido >= 0
                ? "bg-[#1a1f2e] border-[#232a3b]"
                : "bg-red-400/5 border-red-400/20"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {resultado.lucroLiquido >= 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-lime-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs text-gray-400 uppercase font-semibold">Lucro Liquido</span>
              </div>
              <p className={`text-2xl font-bold ${resultado.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
                {formatCurrency(resultado.lucroLiquido)}
              </p>
            </div>

            {/* Margem Empresa */}
            <div className={`rounded-xl p-5 border ring-2 ${
              resultado.vendaSaudavel
                ? "bg-lime-400/5 border-lime-400/20 ring-lime-400/20"
                : "bg-red-400/5 border-red-400/20 ring-red-400/20"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {resultado.vendaSaudavel ? (
                  <CheckCircle2 className="w-4 h-4 text-lime-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs text-gray-400 uppercase font-semibold">Margem Empresa</span>
              </div>
              <p className={`text-2xl font-bold ${resultado.vendaSaudavel ? "text-lime-400" : "text-red-400"}`}>
                {(resultado.margemEmpresa * 100).toFixed(1)}%
              </p>
              <p className="text-xs mt-1">
                {resultado.vendaSaudavel ? (
                  <span className="text-lime-400 font-medium">Venda Saudavel</span>
                ) : (
                  <span className="text-red-400 font-medium">Margem Abaixo de 20%</span>
                )}
              </p>
            </div>
          </div>

          {/* Alerta de excecao */}
          {resultado.ehExcecao && resultado.margemOk && (
            <div className="flex items-center gap-3 bg-amber-400/10 border border-amber-400/20 rounded-xl px-5 py-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">
                Esta venda usa margem de excecao ({parseFloat(margemMinima).toFixed(2)}x).
                Cada vendedor pode usar no maximo <strong>3 vendas de excecao por mes</strong>.
              </p>
            </div>
          )}

          {/* Alerta margem vendedor */}
          {!resultado.margemOk && (
            <div className="flex items-center gap-3 bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">
                Margem do vendedor ({resultado.margem.toFixed(2)}x) esta abaixo do minimo ({parseFloat(margemMinima).toFixed(2)}x).
                Voce <strong>nao recebera comissao sobre o over</strong> nesta venda.
              </p>
            </div>
          )}

          {/* Tabela detalhada de custos */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#232a3b]">
              <h2 className="font-semibold text-gray-100">Detalhamento de Custos</h2>
            </div>
            <div className="divide-y divide-[#232a3b]">
              <CustoRow label="Equipamentos" valor={custoEquip} tipo="Informado" />
              <CustoRow label="Instalacao" valor={resultado.custoInstalacao} tipo={`${parseInt(placas) || 0} placas x R$${config?.custoPlacaInstalacao} + ${parseInt(inversores) || 1} inv x R$${config?.custoInversorInstalacao}`} />
              <CustoRow label="Visita Tecnica" valor={resultado.custoVisitaTecnica} tipo="Fixo" fixo />
              <CustoRow label="COSERN" valor={resultado.custoCosern} tipo="Fixo" fixo />
              <CustoRow label="TRT/CREA" valor={resultado.custoTrtCrea} tipo="Fixo" fixo />
              <CustoRow label="Material CA" valor={resultado.custoMaterialCA} tipo="Fixo" fixo />
              <CustoRow label="Engenheiro" valor={resultado.custoEngenheiro} tipo="Fixo" fixo />
              <CustoRow label={`Imposto (${((config?.aliquotaImpostoPadrao ?? 0.06) * 100).toFixed(0)}%)`} valor={resultado.custoImposto} tipo="Proporcional" />
              <CustoRow label={`Comissao (${((config?.percentualComissaoVenda ?? 0.025) * 100).toFixed(1)}%)`} valor={resultado.comissaoVendedor} tipo="Proporcional" />

              {/* Total */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#141820]">
                <div>
                  <p className="font-bold text-amber-400 uppercase text-sm">Custo Total Operacional</p>
                </div>
                <p className="font-bold text-lg text-amber-400">
                  {formatCurrency(resultado.custoTotalOperacional)}
                </p>
              </div>

              {/* Lucro */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#141820]">
                <div>
                  <p className={`font-bold uppercase text-sm ${resultado.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
                    Lucro Liquido
                  </p>
                </div>
                <p className={`font-bold text-lg ${resultado.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
                  {formatCurrency(resultado.lucroLiquido)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Vazio */}
      {!resultado && (
        <div className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-12 text-center">
          <Calculator className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">Preencha os dados</h3>
          <p className="text-gray-400">Insira o valor da venda e custo dos equipamentos para ver a simulacao.</p>
        </div>
      )}
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
    <div className="flex items-center justify-between px-6 py-3 hover:bg-[#141820] transition">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-100 font-medium">{label}</p>
        {fixo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400 font-semibold uppercase">
            Fixo
          </span>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-100">{formatCurrency(valor)}</p>
        <p className="text-[10px] text-gray-500">{tipo}</p>
      </div>
    </div>
  );
}

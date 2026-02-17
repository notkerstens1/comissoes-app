"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import CurrencyInput from "@/components/CurrencyInput";
import { Save, AlertTriangle, Calculator, ArrowLeft, ShieldAlert, X } from "lucide-react";
import Link from "next/link";

export default function NovaVendaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [showModalMargem, setShowModalMargem] = useState(false);

  // Campos do formulario
  const [cliente, setCliente] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [distribuidora, setDistribuidora] = useState("");
  const [dataConversao, setDataConversao] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fonte, setFonte] = useState("");
  const [quantidadePlacas, setQuantidadePlacas] = useState("");

  // Valores monetarios - armazenamos o display (string formatada) e o numerico separados
  const [valorVendaDisplay, setValorVendaDisplay] = useState("");
  const [valorVendaNum, setValorVendaNum] = useState(0);

  const [custoEquipDisplay, setCustoEquipDisplay] = useState("");
  const [custoEquipNum, setCustoEquipNum] = useState(0);

  const [kwpDisplay, setKwpDisplay] = useState("");
  const [kwpNum, setKwpNum] = useState(0);

  // Callbacks para CurrencyInput
  const handleValorVenda = useCallback((num: number, display: string) => {
    setValorVendaNum(num);
    setValorVendaDisplay(display);
  }, []);

  const handleCustoEquip = useCallback((num: number, display: string) => {
    setCustoEquipNum(num);
    setCustoEquipDisplay(display);
  }, []);

  const handleKwp = useCallback((num: number, display: string) => {
    setKwpNum(num);
    setKwpDisplay(display);
  }, []);

  // Calculos em tempo real usando os valores numericos
  const valor = valorVendaNum;
  const equipamentos = custoEquipNum;
  const kwpCalc = kwpNum;

  const margem = equipamentos > 0 ? valor / equipamentos : 0;
  const over = margem >= 1.8 ? Math.max(valor - equipamentos * 1.8, 0) : 0;
  const geracaoKwh = kwpCalc * 136;
  // Comissao de 2,5% SEMPRE incide, independente da margem
  const comissaoVenda = valor * 0.025;
  const alertaMargem = margem > 0 && margem < 1.8;

  // Funcao para salvar a venda (chamada diretamente ou apos confirmacao do modal)
  const salvarVenda = async () => {
    setErro("");
    setLoading(true);
    setShowModalMargem(false);

    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente,
          formaPagamento,
          distribuidora,
          valorVenda: valor,
          kwp: kwpCalc,
          custoEquipamentos: equipamentos,
          quantidadePlacas: parseInt(quantidadePlacas) || 0,
          dataConversao,
          fonte,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar venda");
      }

      setSucesso(true);
      setTimeout(() => router.push("/vendas"), 1500);
    } catch (error: any) {
      setErro(error.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Se margem abaixo de 1.8x, mostra modal de confirmacao
    if (alertaMargem) {
      setShowModalMargem(true);
      return;
    }

    // Se margem ok, salva direto
    await salvarVenda();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* MODAL DE CONFIRMACAO - MARGEM BAIXA */}
      {showModalMargem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1f2e] rounded-2xl max-w-md w-full shadow-lg">
            {/* Header do modal */}
            <div className="flex items-center justify-between p-6 border-b border-[#232a3b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400/10 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-lg text-gray-100">Margem Abaixo de 1.8x</h3>
              </div>
              <button
                onClick={() => setShowModalMargem(false)}
                className="text-gray-500 hover:text-gray-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-amber-400">Cliente</span>
                  <span className="font-medium text-amber-400">{cliente}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-amber-400">Valor da Venda</span>
                  <span className="font-medium text-amber-400">{formatCurrency(valor)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-400">Margem</span>
                  <span className="font-bold text-red-400">{formatNumber(margem)}x</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Esta venda esta com margem de <strong className="text-red-400">{formatNumber(margem)}x</strong>, abaixo do minimo de <strong>1.8x</strong>.
                </p>
                <p className="text-sm text-gray-300">
                  Voce <strong>nao recebera comissao sobre o over</strong> desta venda, apenas a comissao de 2,5% ({formatCurrency(comissaoVenda)}).
                </p>
                <p className="text-sm font-medium text-amber-400 mt-3">
                  Voce confirmou esta margem com seu supervisor?
                </p>
              </div>
            </div>

            {/* Botoes do modal */}
            <div className="p-6 border-t border-[#232a3b] flex gap-3">
              <button
                onClick={() => setShowModalMargem(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarVenda}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Sim, supervisor aprovou
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link
          href="/vendas"
          className="text-gray-500 hover:text-gray-400 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Nova Venda</h1>
          <p className="text-gray-400">Registre uma nova venda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] space-y-5">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nome do Cliente *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                placeholder="Nome completo do cliente"
                required
              />
            </div>

            {/* Forma Pagamento + Distribuidora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                >
                  <option value="">Selecione...</option>
                  <option value="SANTANDER">Santander</option>
                  <option value="BV">BV</option>
                  <option value="SOLFACIL">Solfacil</option>
                  <option value="A_VISTA">A Vista</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Distribuidora
                </label>
                <select
                  value={distribuidora}
                  onChange={(e) => setDistribuidora(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                >
                  <option value="">Selecione...</option>
                  <option value="BELENERGY">Belenergy</option>
                  <option value="SOLFACIL">Solfacil</option>
                  <option value="BLUESUN">Bluesun</option>
                </select>
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Valor da Venda (R$) *
                </label>
                <CurrencyInput
                  value={valorVendaDisplay}
                  onValueChange={handleValorVenda}
                  placeholder="Ex: 12.890,00"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Custo Equipamentos (R$) *
                </label>
                <CurrencyInput
                  value={custoEquipDisplay}
                  onValueChange={handleCustoEquip}
                  placeholder="Ex: 6.043,00"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  kWp
                </label>
                <CurrencyInput
                  value={kwpDisplay}
                  onValueChange={handleKwp}
                  placeholder="Ex: 5,40"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Qtd. Placas *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidadePlacas}
                  onChange={(e) => setQuantidadePlacas(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                  placeholder="Ex: 8"
                  required
                />
              </div>
            </div>

            {/* Data + Fonte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Data de Conversao *
                </label>
                <input
                  type="date"
                  value={dataConversao}
                  onChange={(e) => setDataConversao(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Fonte do Lead
                </label>
                <select
                  value={fonte}
                  onChange={(e) => setFonte(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none bg-[#141820] text-gray-100"
                >
                  <option value="">Selecione...</option>
                  <option value="TRAFEGO">Trafego</option>
                  <option value="INDICACAO">Indicacao</option>
                </select>
              </div>
            </div>

            {/* Alerta de Margem inline */}
            {alertaMargem && (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-400">Margem abaixo de 1.8x</p>
                  <p className="text-sm text-amber-400 mt-1">
                    Esta venda esta com margem de {formatNumber(margem)}x. Voce nao recebera
                    comissao sobre o <strong>over</strong> desta venda. A comissao de 2,5% sobre a venda continua valida.
                  </p>
                </div>
              </div>
            )}

            {/* Erros e Sucesso */}
            {erro && (
              <div className="bg-red-400/10 text-red-400 px-4 py-3 rounded-lg text-sm">
                {erro}
              </div>
            )}
            {sucesso && (
              <div className="bg-lime-400/10 text-lime-400 px-4 py-3 rounded-lg text-sm">
                Venda registrada com sucesso! Redirecionando...
              </div>
            )}

            {/* Botao Salvar */}
            <button
              type="submit"
              disabled={loading || sucesso}
              className="w-full bg-lime-400 text-gray-900 py-3 rounded-lg font-semibold hover:bg-lime-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Venda
                </>
              )}
            </button>
          </form>
        </div>

        {/* Painel de Calculos em Tempo Real */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-lime-400" />
              <h3 className="font-semibold text-gray-100">Calculo em Tempo Real</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-[#232a3b]">
                <span className="text-sm text-gray-400">Margem</span>
                <span className={`font-semibold ${alertaMargem ? "text-red-400" : "text-lime-400"}`}>
                  {margem > 0 ? `${formatNumber(margem)}x` : "-"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#232a3b]">
                <span className="text-sm text-gray-400">Over</span>
                <span className={`font-semibold ${over > 0 ? "text-lime-400" : "text-gray-500"}`}>
                  {formatCurrency(over)}
                  {alertaMargem && <span className="text-xs text-red-400 ml-1">(sem over)</span>}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#232a3b]">
                <span className="text-sm text-gray-400">Geracao kWh</span>
                <span className="font-semibold text-gray-100">
                  {geracaoKwh > 0 ? `${formatNumber(geracaoKwh, 0)} kWh` : "-"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#232a3b]">
                <span className="text-sm text-gray-400">Comissao Venda (2,5%)</span>
                <span className="font-semibold text-lime-400">
                  {formatCurrency(comissaoVenda)}
                </span>
              </div>

              {over > 0 && (
                <div className="flex justify-between py-2 border-b border-[#232a3b]">
                  <span className="text-sm text-gray-400">Comissao Over*</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(over * 0.35)}
                    <span className="text-xs text-gray-500 ml-1">(35%)</span>
                  </span>
                </div>
              )}

              <div className="bg-lime-400/10 rounded-lg p-4 mt-4">
                <p className="text-xs text-lime-400 font-medium uppercase tracking-wider">
                  Comissao Estimada
                </p>
                <p className="text-2xl font-bold text-lime-400 mt-1">
                  {formatCurrency(comissaoVenda + (over > 0 ? over * 0.35 : 0))}
                </p>
                <p className="text-xs text-lime-400 mt-1">
                  {over > 0
                    ? `${formatCurrency(comissaoVenda)} (venda) + ${formatCurrency(over * 0.35)} (over)`
                    : `2,5% sobre ${formatCurrency(valor)}`
                  }
                </p>
                {over > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    * % over pode variar conforme faixa mensal
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

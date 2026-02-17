"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Settings, Save, Calculator } from "lucide-react";
import { handleCurrencyKeyInput, formatCurrencyInput } from "@/lib/utils";
import { isDiretor } from "@/lib/roles";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const showCustos = isDiretor(session?.user?.role);
  const [config, setConfig] = useState({
    fatorMultiplicador: 1.8,
    fatorGeracao: 136,
    percentualComissaoVenda: 0.025,
    volumeMinimoComissao: 60000,
    custoPlacaInstalacao: 70,
    custoInversorInstalacao: 250,
    custoVisitaTecnicaPadrao: 120,
    custoCosernPadrao: 70,
    custoTrtCreaPadrao: 65,
    custoEngenheiroPadrao: 400,
    aliquotaImpostoPadrao: 0.06,
  });

  // Displays para campos monetarios
  const [displays, setDisplays] = useState({
    volumeMinimoComissao: "",
    custoPlacaInstalacao: "",
    custoInversorInstalacao: "",
    custoVisitaTecnicaPadrao: "",
    custoCosernPadrao: "",
    custoTrtCreaPadrao: "",
    custoEngenheiroPadrao: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    fetch("/api/admin/configuracoes")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        // Inicializa displays formatados
        setDisplays({
          volumeMinimoComissao: formatCurrencyInput(data.volumeMinimoComissao || 60000),
          custoPlacaInstalacao: formatCurrencyInput(data.custoPlacaInstalacao || 70),
          custoInversorInstalacao: formatCurrencyInput(data.custoInversorInstalacao || 250),
          custoVisitaTecnicaPadrao: formatCurrencyInput(data.custoVisitaTecnicaPadrao || 120),
          custoCosernPadrao: formatCurrencyInput(data.custoCosernPadrao || 70),
          custoTrtCreaPadrao: formatCurrencyInput(data.custoTrtCreaPadrao || 65),
          custoEngenheiroPadrao: formatCurrencyInput(data.custoEngenheiroPadrao || 400),
        });
        setLoading(false);
      });
  }, []);

  const handleCurrencyField = (field: keyof typeof displays, rawValue: string) => {
    if (rawValue === "") {
      setDisplays({ ...displays, [field]: "" });
      setConfig({ ...config, [field]: 0 });
      return;
    }
    const { display, numericValue } = handleCurrencyKeyInput(rawValue);
    setDisplays({ ...displays, [field]: display });
    setConfig({ ...config, [field]: numericValue });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSucesso(false);
    try {
      await fetch("/api/admin/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      console.error(error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Configuracoes</h1>
        <p className="text-gray-400">Parametros gerais do sistema</p>
      </div>

      <form onSubmit={salvar} className="space-y-6">
        {/* Parametros de Comissao */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-lime-400" />
            <h2 className="font-semibold text-gray-100">Parametros de Comissao</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fator Multiplicador (1.6 a 1.8)
            </label>
            <input
              type="number"
              step="0.01"
              min="1.6"
              max="1.8"
              value={config.fatorMultiplicador}
              onChange={(e) => setConfig({ ...config, fatorMultiplicador: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Usado para calcular o OVER: Valor Venda - Equipamentos x Fator</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fator de Geracao (kWh)</label>
            <input
              type="number"
              value={config.fatorGeracao}
              onChange={(e) => setConfig({ ...config, fatorGeracao: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">kWp x Fator = Geracao mensal estimada</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Percentual Comissao Venda</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.percentualComissaoVenda}
                  onChange={(e) => setConfig({ ...config, percentualComissaoVenda: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
                />
                <span className="text-gray-400 text-sm whitespace-nowrap">
                  ({(config.percentualComissaoVenda * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Volume Minimo Comissao (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.volumeMinimoComissao}
                onChange={(e) => handleCurrencyField("volumeMinimoComissao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 60.000,00"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Custos Padrao - Somente visivel para Diretor */}
        {showCustos && <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-amber-400/20 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-gray-100">Custos Padrao (Visao Diretor)</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-3">
            Esses valores sao usados como padrao ao criar cada venda. O diretor pode ajustar individualmente depois.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Custo Instalacao por Placa (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoPlacaInstalacao}
                onChange={(e) => handleCurrencyField("custoPlacaInstalacao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 70,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Custo por Inversor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoInversorInstalacao}
                onChange={(e) => handleCurrencyField("custoInversorInstalacao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 250,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Visita Tecnica (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoVisitaTecnicaPadrao}
                onChange={(e) => handleCurrencyField("custoVisitaTecnicaPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 120,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">COSERN Padrao (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoCosernPadrao}
                onChange={(e) => handleCurrencyField("custoCosernPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 70,00"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">Padrao: 2 solicitacoes x R$35</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">TRT/CREA (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoTrtCreaPadrao}
                onChange={(e) => handleCurrencyField("custoTrtCreaPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 65,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Engenheiro por Instalacao (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoEngenheiroPadrao}
                onChange={(e) => handleCurrencyField("custoEngenheiroPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-500"
                placeholder="Ex: 400,00"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">Custo pago ao engenheiro por cada instalacao</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Aliquota Imposto</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.aliquotaImpostoPadrao}
                  onChange={(e) => setConfig({ ...config, aliquotaImpostoPadrao: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
                <span className="text-gray-400 text-sm whitespace-nowrap">
                  ({(config.aliquotaImpostoPadrao * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Sobre o valor do servico (Venda - Equipamentos)</p>
            </div>
          </div>
        </div>}

        {sucesso && (
          <div className="bg-lime-400/10 text-lime-400 px-4 py-3 rounded-lg text-sm">
            Configuracoes salvas com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-lime-400 text-gray-900 px-6 py-2.5 rounded-lg font-medium hover:bg-lime-500 transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Tudo
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Settings, Save, Calculator, Target } from "lucide-react";
import { handleCurrencyKeyInput, formatCurrencyInput } from "@/lib/utils";
import { isDiretor } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";

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
    metaReceitaMensal: 360000,
    percentualSupervisorAte80: 0,
    percentualSupervisor80a100: 0.008,
    percentualSupervisorAcima100: 0.01,
    metaVendasQtdMes: 8,
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
    metaReceitaMensal: "",
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
          metaReceitaMensal: formatCurrencyInput(data.metaReceitaMensal || 360000),
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Administração"
        title="Configuracoes"
        subtitle="Parametros gerais do sistema"
      />

      <form onSubmit={salvar} className="space-y-6">
        {/* Meta do dashboard (ranking ao vivo) */}
        <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-liv-sage" />
            <h2 className="font-semibold text-liv-ink">Meta do Dashboard</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-liv-muted mb-1">
              Meta de vendas por vendedor (qtd/mês)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={config.metaVendasQtdMes ?? 8}
              onChange={(e) => setConfig({ ...config, metaVendasQtdMes: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
            />
            <p className="text-xs text-liv-faint mt-1">
              Quantas vendas no mês contam como &quot;meta batida&quot; no ranking ao vivo (por vendedor, na visão Mês).
            </p>
          </div>
        </div>

        {/* Parametros de Comissao */}
        <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-liv-sage" />
            <h2 className="font-semibold text-liv-ink">Parametros de Comissao</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-liv-muted mb-1">
              Fator Multiplicador (1.6 a 1.8)
            </label>
            <input
              type="number"
              step="0.01"
              min="1.6"
              max="1.8"
              value={config.fatorMultiplicador}
              onChange={(e) => setConfig({ ...config, fatorMultiplicador: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
            />
            <p className="text-xs text-liv-faint mt-1">Usado para calcular o OVER: Valor Venda - Equipamentos x Fator</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-liv-muted mb-1">Fator de Geracao (kWh)</label>
            <input
              type="number"
              value={config.fatorGeracao}
              onChange={(e) => setConfig({ ...config, fatorGeracao: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
            />
            <p className="text-xs text-liv-faint mt-1">kWp x Fator = Geracao mensal estimada</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Percentual Comissao Venda</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.percentualComissaoVenda}
                  onChange={(e) => setConfig({ ...config, percentualComissaoVenda: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                />
                <span className="text-liv-muted text-sm whitespace-nowrap">
                  ({(config.percentualComissaoVenda * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Volume Minimo Comissao (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.volumeMinimoComissao}
                onChange={(e) => handleCurrencyField("volumeMinimoComissao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none placeholder-liv-faint"
                placeholder="Ex: 60.000,00"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Custos Padrao - Somente visivel para Diretor */}
        {showCustos && <div className="bg-liv-surface rounded-2xl p-6 border border-liv-gold/20 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-liv-gold" />
            <h2 className="font-semibold text-liv-ink">Custos Padrao (Visao Diretor)</h2>
          </div>
          <p className="text-xs text-liv-faint -mt-3">
            Esses valores sao usados como padrao ao criar cada venda. O diretor pode ajustar individualmente depois.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Custo Instalacao por Placa (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoPlacaInstalacao}
                onChange={(e) => handleCurrencyField("custoPlacaInstalacao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none placeholder-liv-faint"
                placeholder="Ex: 70,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Custo por Inversor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoInversorInstalacao}
                onChange={(e) => handleCurrencyField("custoInversorInstalacao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none placeholder-liv-faint"
                placeholder="Ex: 250,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Visita Tecnica (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoVisitaTecnicaPadrao}
                onChange={(e) => handleCurrencyField("custoVisitaTecnicaPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none placeholder-liv-faint"
                placeholder="Ex: 120,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">COSERN Padrao (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoCosernPadrao}
                onChange={(e) => handleCurrencyField("custoCosernPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none placeholder-liv-faint"
                placeholder="Ex: 70,00"
                autoComplete="off"
              />
              <p className="text-xs text-liv-faint mt-1">Padrao: 2 solicitacoes x R$35</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">TRT/CREA (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoTrtCreaPadrao}
                onChange={(e) => handleCurrencyField("custoTrtCreaPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none placeholder-liv-faint"
                placeholder="Ex: 65,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Engenheiro por Instalacao (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={displays.custoEngenheiroPadrao}
                onChange={(e) => handleCurrencyField("custoEngenheiroPadrao", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none placeholder-liv-faint"
                placeholder="Ex: 400,00"
                autoComplete="off"
              />
              <p className="text-xs text-liv-faint mt-1">Custo pago ao engenheiro por cada instalacao</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">Aliquota Imposto</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.aliquotaImpostoPadrao}
                  onChange={(e) => setConfig({ ...config, aliquotaImpostoPadrao: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-gold focus:border-liv-gold outline-none"
                />
                <span className="text-liv-muted text-sm whitespace-nowrap">
                  ({(config.aliquotaImpostoPadrao * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-xs text-liv-faint mt-1">Sobre o valor do servico (Venda - Equipamentos)</p>
            </div>
          </div>
        </div>}

        {/* Comissao do Supervisor — apenas Diretor */}
        {showCustos && <div className="bg-liv-surface rounded-2xl p-6 border border-liv-violet/20 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-liv-violet" />
            <h2 className="font-semibold text-liv-ink">Comissao do Supervisor</h2>
          </div>
          <p className="text-xs text-liv-faint -mt-3">
            Meta total da empresa e faixas de comissao do supervisor de operacao. Aplica conforme % atingida.
          </p>

          <div>
            <label className="block text-sm font-medium text-liv-muted mb-1">Meta de Receita Mensal (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={displays.metaReceitaMensal}
              onChange={(e) => handleCurrencyField("metaReceitaMensal", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-violet focus:border-liv-violet outline-none placeholder-liv-faint"
              placeholder="Ex: 360.000,00"
              autoComplete="off"
            />
            <p className="text-xs text-liv-faint mt-1">Soma das metas individuais. Atualize quando entrar/sair vendedor.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">% se &lt; 80% da meta</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.percentualSupervisorAte80}
                  onChange={(e) => setConfig({ ...config, percentualSupervisorAte80: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-violet outline-none"
                />
                <span className="text-liv-muted text-sm">({(config.percentualSupervisorAte80 * 100).toFixed(2)}%)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">% se 80% - 99%</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.percentualSupervisor80a100}
                  onChange={(e) => setConfig({ ...config, percentualSupervisor80a100: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-violet outline-none"
                />
                <span className="text-liv-muted text-sm">({(config.percentualSupervisor80a100 * 100).toFixed(2)}%)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-liv-muted mb-1">% se &gt;= 100%</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={config.percentualSupervisorAcima100}
                  onChange={(e) => setConfig({ ...config, percentualSupervisorAcima100: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-violet outline-none"
                />
                <span className="text-liv-muted text-sm">({(config.percentualSupervisorAcima100 * 100).toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </div>}

        {sucesso && (
          <div className="bg-liv-sage/10 text-liv-sage px-4 py-3 rounded-lg text-sm">
            Configuracoes salvas com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-liv-sage text-liv-bg px-6 py-2.5 rounded-lg font-medium hover:bg-liv-sage-deep transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Tudo
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
// formatCurrency available from "@/lib/utils" if needed
import { Layers, Save, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface Faixa {
  id?: string;
  ordem: number;
  volumeMinimo: number;
  volumeMaximo: number | null;
  percentualOver: number;
  ativa: boolean;
}

export default function FaixasPage() {
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    fetch("/api/admin/faixas")
      .then((r) => r.json())
      .then((data) => {
        setFaixas(data);
        setLoading(false);
      });
  }, []);

  const addFaixa = () => {
    const lastFaixa = faixas[faixas.length - 1];
    setFaixas([
      ...faixas,
      {
        ordem: faixas.length + 1,
        volumeMinimo: lastFaixa ? (lastFaixa.volumeMaximo || 0) : 0,
        volumeMaximo: null,
        percentualOver: 0.35,
        ativa: true,
      },
    ]);
  };

  const removeFaixa = (index: number) => {
    setFaixas(faixas.filter((_, i) => i !== index));
  };

  const updateFaixa = (index: number, field: keyof Faixa, value: any) => {
    const novasFaixas = [...faixas];
    (novasFaixas[index] as any)[field] = value;
    setFaixas(novasFaixas);
  };

  const salvar = async () => {
    setSaving(true);
    setSucesso(false);
    try {
      await fetch("/api/admin/faixas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faixas }),
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
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Administração"
        title="Faixas de Comissao"
        subtitle="Configure as faixas progressivas de comissao sobre over"
        actions={
          <button
            onClick={addFaixa}
            className="bg-liv-sage text-liv-bg px-4 py-2 rounded-lg font-medium hover:bg-liv-sage-deep transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar Faixa
          </button>
        }
      />

      <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-liv-sage" />
          <h2 className="font-semibold text-liv-ink">Faixas Progressivas</h2>
        </div>

        <p className="text-sm text-liv-muted bg-liv-bg p-3 rounded-lg border border-liv-line">
          As faixas sao progressivas (tipo IR): a faixa superior so se aplica ao valor que excede o limite da faixa anterior.
        </p>

        {faixas.map((faixa, i) => (
          <div key={i} className="flex items-end gap-3 p-4 bg-liv-bg rounded-xl border border-liv-line">
            <div className="flex-shrink-0">
              <span className="text-sm font-bold text-liv-faint">#{i + 1}</span>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-liv-muted mb-1">Volume Minimo (R$)</label>
              <input
                type="number"
                value={faixa.volumeMinimo}
                onChange={(e) => updateFaixa(i, "volumeMinimo", parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-liv-muted mb-1">Volume Maximo (R$)</label>
              <input
                type="number"
                value={faixa.volumeMaximo || ""}
                onChange={(e) => updateFaixa(i, "volumeMaximo", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm placeholder-liv-faint focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                placeholder="Sem limite"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-liv-muted mb-1">% Over</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={faixa.percentualOver}
                  onChange={(e) => updateFaixa(i, "percentualOver", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                />
                <span className="text-xs text-liv-faint">({(faixa.percentualOver * 100).toFixed(0)}%)</span>
              </div>
            </div>
            <button
              onClick={() => removeFaixa(i)}
              className="text-liv-danger hover:bg-liv-danger/10 transition p-2 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {sucesso && (
          <div className="bg-liv-sage/10 text-liv-sage px-4 py-3 rounded-lg text-sm">
            Faixas salvas com sucesso!
          </div>
        )}

        <button
          onClick={salvar}
          disabled={saving}
          className="bg-liv-sage text-liv-bg px-6 py-2.5 rounded-lg font-medium hover:bg-liv-sage-deep transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Faixas
        </button>
      </div>
    </div>
  );
}

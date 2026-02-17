"use client";

import { useEffect, useState } from "react";
// formatCurrency available from "@/lib/utils" if needed
import { Layers, Save, Plus, Trash2 } from "lucide-react";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Faixas de Comissao</h1>
          <p className="text-gray-400">Configure as faixas progressivas de comissao sobre over</p>
        </div>
        <button
          onClick={addFaixa}
          className="bg-lime-400 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-lime-500 transition flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Faixa
        </button>
      </div>

      <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-lime-400" />
          <h2 className="font-semibold text-gray-100">Faixas Progressivas</h2>
        </div>

        <p className="text-sm text-gray-400 bg-[#141820] p-3 rounded-lg">
          As faixas sao progressivas (tipo IR): a faixa superior so se aplica ao valor que excede o limite da faixa anterior.
        </p>

        {faixas.map((faixa, i) => (
          <div key={i} className="flex items-end gap-3 p-4 bg-[#141820] rounded-lg">
            <div className="flex-shrink-0">
              <span className="text-sm font-bold text-gray-500">#{i + 1}</span>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">Volume Minimo (R$)</label>
              <input
                type="number"
                value={faixa.volumeMinimo}
                onChange={(e) => updateFaixa(i, "volumeMinimo", parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">Volume Maximo (R$)</label>
              <input
                type="number"
                value={faixa.volumeMaximo || ""}
                onChange={(e) => updateFaixa(i, "volumeMaximo", e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 text-sm placeholder-gray-500"
                placeholder="Sem limite"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-400 mb-1">% Over</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={faixa.percentualOver}
                  onChange={(e) => updateFaixa(i, "percentualOver", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 text-sm"
                />
                <span className="text-xs text-gray-400">({(faixa.percentualOver * 100).toFixed(0)}%)</span>
              </div>
            </div>
            <button
              onClick={() => removeFaixa(i)}
              className="text-red-400 hover:text-red-300 transition p-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {sucesso && (
          <div className="bg-lime-400/10 text-lime-400 px-4 py-3 rounded-lg text-sm">
            Faixas salvas com sucesso!
          </div>
        )}

        <button
          onClick={salvar}
          disabled={saving}
          className="bg-lime-400 text-gray-900 px-6 py-2.5 rounded-lg font-medium hover:bg-lime-500 transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Faixas
        </button>
      </div>
    </div>
  );
}

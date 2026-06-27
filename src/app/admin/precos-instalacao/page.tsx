"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, DollarSign, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PRECO_MATERIAL_LABELS } from "@/lib/margem-instalacao";
import { PageHeader } from "@/components/ui/page-header";

interface PrecoMaterial {
  id: string;
  chave: string;
  label: string;
  precoUnit: number;
  unidade: string;
  ativo: boolean;
}

interface CustoDeslocamento {
  id: string;
  cidade: string;
  valor: number;
}

export default function PrecosInstalacaoPage() {
  const [precos, setPrecos] = useState<PrecoMaterial[]>([]);
  const [deslocamentos, setDeslocamentos] = useState<CustoDeslocamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editsPreco, setEditsPreco] = useState<Record<string, string>>({});
  const [editsDesloc, setEditsDesloc] = useState<Record<string, string>>({});
  const [novaCidade, setNovaCidade] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/precos-materiais").then((r) => r.json()),
      fetch("/api/admin/custos-deslocamento").then((r) => r.json()),
    ]).then(([p, d]) => {
      setPrecos(p);
      setDeslocamentos(d);
      setLoading(false);
    });
  }, []);

  async function salvarPreco(chave: string) {
    const valor = parseFloat(editsPreco[chave]);
    if (isNaN(valor)) return;
    await fetch("/api/admin/precos-materiais", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave, precoUnit: valor }),
    });
    setPrecos(precos.map((p) => p.chave === chave ? { ...p, precoUnit: valor } : p));
    setEditsPreco({ ...editsPreco, [chave]: "" });
    setSucesso(`Preco de ${PRECO_MATERIAL_LABELS[chave] ?? chave} atualizado`);
    setTimeout(() => setSucesso(""), 2500);
  }

  async function salvarDeslocamento(cidade: string) {
    const valor = parseFloat(editsDesloc[cidade]);
    if (isNaN(valor)) return;
    await fetch("/api/admin/custos-deslocamento", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cidade, valor }),
    });
    setDeslocamentos(deslocamentos.map((d) => d.cidade === cidade ? { ...d, valor } : d));
    setEditsDesloc({ ...editsDesloc, [cidade]: "" });
    setSucesso(`Deslocamento de ${cidade} atualizado`);
    setTimeout(() => setSucesso(""), 2500);
  }

  async function adicionarCidade() {
    if (!novaCidade.trim() || !novoValor) return;
    const valor = parseFloat(novoValor);
    if (isNaN(valor)) return;
    const r = await fetch("/api/admin/custos-deslocamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cidade: novaCidade.trim(), valor }),
    });
    if (r.ok) {
      const novo = await r.json();
      setDeslocamentos([...deslocamentos, novo].sort((a, b) => a.cidade.localeCompare(b.cidade)));
      setNovaCidade("");
      setNovoValor("");
    }
  }

  async function removerCidade(cidade: string) {
    if (!confirm(`Remover ${cidade}?`)) return;
    await fetch(`/api/admin/custos-deslocamento?cidade=${encodeURIComponent(cidade)}`, { method: "DELETE" });
    setDeslocamentos(deslocamentos.filter((d) => d.cidade !== cidade));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liv-sage"></div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Administração"
        title="Precos de Instalacao"
        subtitle="Material e deslocamento — usados pra calcular custo estimado da instalacao na hora da venda."
      />

      {sucesso && (
        <div className="bg-liv-sage/10 text-liv-sage px-4 py-3 rounded-lg text-sm">{sucesso}</div>
      )}

      {/* Precos de material */}
      <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-liv-teal" />
          <h2 className="font-semibold text-liv-ink">Material</h2>
        </div>
        <div className="space-y-2">
          {precos.map((p) => (
            <div key={p.chave} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-liv-ink">{p.label}</span>
              <span className="text-xs text-liv-faint">por {p.unidade}</span>
              <span className="text-sm text-liv-ink font-medium tabular-nums w-20 text-right">{formatCurrency(p.precoUnit)}</span>
              <input
                type="number"
                step="0.01"
                placeholder="novo valor"
                value={editsPreco[p.chave] ?? ""}
                onChange={(e) => setEditsPreco({ ...editsPreco, [p.chave]: e.target.value })}
                className="w-24 px-2 py-1 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
              />
              <button
                onClick={() => salvarPreco(p.chave)}
                disabled={!editsPreco[p.chave]}
                className="px-3 py-1 rounded-lg bg-liv-teal text-liv-bg text-xs font-medium disabled:opacity-30 hover:opacity-90 transition"
              >
                <Save className="w-3 h-3 inline" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Deslocamento por cidade */}
      <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-liv-teal" />
          <h2 className="font-semibold text-liv-ink">Deslocamento por cidade</h2>
        </div>
        <div className="space-y-2 mb-4">
          {deslocamentos.map((d) => (
            <div key={d.cidade} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-liv-ink">{d.cidade}</span>
              <span className="text-sm text-liv-ink font-medium tabular-nums w-24 text-right">{formatCurrency(d.valor)}</span>
              <input
                type="number"
                step="0.01"
                placeholder="novo valor"
                value={editsDesloc[d.cidade] ?? ""}
                onChange={(e) => setEditsDesloc({ ...editsDesloc, [d.cidade]: e.target.value })}
                className="w-24 px-2 py-1 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
              />
              <button
                onClick={() => salvarDeslocamento(d.cidade)}
                disabled={!editsDesloc[d.cidade]}
                className="px-3 py-1 rounded-lg bg-liv-teal text-liv-bg text-xs font-medium disabled:opacity-30 hover:opacity-90 transition"
              >
                <Save className="w-3 h-3 inline" />
              </button>
              <button
                onClick={() => removerCidade(d.cidade)}
                className="px-2 py-1 rounded-lg text-liv-danger hover:bg-liv-danger/10 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-liv-line">
          <input
            type="text"
            value={novaCidade}
            onChange={(e) => setNovaCidade(e.target.value)}
            placeholder="Nova cidade"
            className="flex-1 px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
          />
          <input
            type="number"
            step="0.01"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
            placeholder="R$"
            className="w-24 px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink text-sm focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
          />
          <button
            onClick={adicionarCidade}
            className="px-3 py-2 rounded-lg bg-liv-sage text-liv-bg text-sm font-medium hover:bg-liv-sage-deep transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

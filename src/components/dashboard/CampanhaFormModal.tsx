"use client";

import { useState, useEffect } from "react";
import { SlidePanel } from "@/components/ui/slide-panel";
import CurrencyInput from "@/components/CurrencyInput";
import { formatCurrencyInput } from "@/lib/utils";

interface Campanha {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  escopo: string;
  meta: number;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campanha?: Campanha | null;
  onSaved: () => void;
}

export function CampanhaFormModal({ isOpen, onClose, campanha, onSaved }: Props) {
  const isEdit = !!campanha;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"VALOR" | "QUANTIDADE">("VALOR");
  const [escopo, setEscopo] = useState<"TIME" | "INDIVIDUAL">("TIME");
  const [meta, setMeta] = useState(0);
  const [metaDisplay, setMetaDisplay] = useState("");
  const [metaQtd, setMetaQtd] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (campanha) {
        setTitulo(campanha.titulo);
        setDescricao(campanha.descricao || "");
        setTipo(campanha.tipo as "VALOR" | "QUANTIDADE");
        setEscopo(campanha.escopo as "TIME" | "INDIVIDUAL");
        setMeta(campanha.meta);
        setMetaDisplay(formatCurrencyInput(campanha.meta));
        setMetaQtd(String(campanha.meta));
        setDataInicio(campanha.dataInicio);
        setDataFim(campanha.dataFim);
      } else {
        setTitulo("");
        setDescricao("");
        setTipo("VALOR");
        setEscopo("TIME");
        setMeta(0);
        setMetaDisplay("");
        setMetaQtd("");
        setDataInicio("");
        setDataFim("");
      }
      setError("");
    }
  }, [isOpen, campanha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const metaFinal = tipo === "VALOR" ? meta : Number(metaQtd);

    if (!titulo.trim()) {
      setError("Titulo e obrigatorio");
      return;
    }
    if (metaFinal <= 0) {
      setError("Meta deve ser maior que zero");
      return;
    }
    if (!dataInicio || !dataFim) {
      setError("Datas de inicio e fim sao obrigatorias");
      return;
    }
    if (dataFim < dataInicio) {
      setError("Data fim deve ser maior ou igual a data inicio");
      return;
    }

    setSaving(true);
    try {
      const body = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo,
        escopo,
        meta: metaFinal,
        dataInicio,
        dataFim,
      };

      const url = isEdit ? `/api/campanhas/${campanha!.id}` : "/api/campanhas";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar campanha");
    }
    setSaving(false);
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage/30 focus:border-liv-sage outline-none text-sm";
  const labelClass = "block text-sm font-medium text-liv-muted mb-1.5";
  const selectClass =
    "w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage/30 focus:border-liv-sage outline-none text-sm";

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar Campanha" : "Nova Campanha"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Titulo */}
        <div>
          <label className={labelClass}>Titulo *</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={inputClass}
            placeholder="Ex: Meta de Fevereiro"
            required
          />
        </div>

        {/* Descricao */}
        <div>
          <label className={labelClass}>Descricao</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className={`${inputClass} h-20 resize-none`}
            placeholder="Descricao opcional da campanha..."
          />
        </div>

        {/* Tipo + Escopo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tipo de Meta *</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "VALOR" | "QUANTIDADE")}
              className={selectClass}
            >
              <option value="VALOR">Valor (R$)</option>
              <option value="QUANTIDADE">Quantidade (vendas)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Escopo *</label>
            <select
              value={escopo}
              onChange={(e) => setEscopo(e.target.value as "TIME" | "INDIVIDUAL")}
              className={selectClass}
            >
              <option value="TIME">Time (coletivo)</option>
              <option value="INDIVIDUAL">Individual (por vendedor)</option>
            </select>
          </div>
        </div>

        {/* Dica de escopo */}
        <p className="text-xs text-liv-faint">
          {escopo === "TIME"
            ? "Meta coletiva — a soma de todas as vendas do time conta para atingir a meta."
            : "Meta individual — cada vendedor precisa atingir a meta separadamente."}
        </p>

        {/* Meta */}
        <div>
          <label className={labelClass}>
            Meta {tipo === "VALOR" ? "(R$)" : "(quantidade de vendas)"} *
          </label>
          {tipo === "VALOR" ? (
            <CurrencyInput
              value={metaDisplay}
              onValueChange={(numericValue, displayValue) => {
                setMeta(numericValue);
                setMetaDisplay(displayValue);
              }}
              placeholder="0,00"
              required
            />
          ) : (
            <input
              type="number"
              value={metaQtd}
              onChange={(e) => setMetaQtd(e.target.value)}
              className={inputClass}
              placeholder="Ex: 20"
              min="1"
              required
            />
          )}
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Data Inicio *</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Data Fim *</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-liv-danger/10 border border-liv-danger/30 rounded-lg px-4 py-3">
            <p className="text-sm text-liv-danger">{error}</p>
          </div>
        )}

        {/* Botoes */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-liv-sage hover:bg-liv-sage-deep text-liv-bg font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving
              ? "Salvando..."
              : isEdit
              ? "Salvar Alteracoes"
              : "Criar Campanha"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </SlidePanel>
  );
}

"use client";

import { useState } from "react";
import { formatCurrency, formatCurrencyInput, handleCurrencyKeyInput } from "@/lib/utils";
import { Save, X } from "lucide-react";
import { SlidePanel } from "@/components/ui/slide-panel";

export interface VendaEditavel {
  id: string;
  cliente: string;
  vendedor?: string;
  valorVenda: number;
  custoEquipamentos: number;
  quantidadePlacas: number;
  quantidadeInversores: number;
  custoInstalacao: number;
  custoVisitaTecnica: number;
  custoCosern: number;
  custoTrtCrea: number;
  custoEngenheiro: number;
  custoMaterialCA: number;
  custoImposto: number;
  comissaoVendedor?: number;
  lucroLiquido: number;
  margemLucroLiquido: number;
  percentualComissaoOverride?: number | null;
}

interface EditVendaPanelProps {
  venda: VendaEditavel | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditVendaPanel({ venda, isOpen, onClose, onSaved }: EditVendaPanelProps) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editForm, setEditForm] = useState({
    quantidadePlacas: 0,
    quantidadeInversores: 1,
    custoCosern: 70,
    custoVisitaTecnica: 120,
    custoTrtCrea: 65,
    custoEngenheiro: 400,
    custoMaterialCA: 500,
    percentualComissao: "2.5",
  });

  const [editFormDisplay, setEditFormDisplay] = useState({
    custoCosern: "",
    custoVisitaTecnica: "",
    custoTrtCrea: "",
    custoEngenheiro: "",
    custoMaterialCA: "",
  });

  // Inicializar form quando venda muda
  const iniciarEdicao = (v: VendaEditavel) => {
    const percentual = v.percentualComissaoOverride != null
      ? (v.percentualComissaoOverride * 100).toString()
      : "2.5";
    setEditForm({
      quantidadePlacas: v.quantidadePlacas,
      quantidadeInversores: v.quantidadeInversores,
      custoCosern: v.custoCosern,
      custoVisitaTecnica: v.custoVisitaTecnica,
      custoTrtCrea: v.custoTrtCrea,
      custoEngenheiro: v.custoEngenheiro,
      custoMaterialCA: v.custoMaterialCA,
      percentualComissao: percentual,
    });
    setEditFormDisplay({
      custoCosern: formatCurrencyInput(v.custoCosern),
      custoVisitaTecnica: formatCurrencyInput(v.custoVisitaTecnica),
      custoTrtCrea: formatCurrencyInput(v.custoTrtCrea),
      custoEngenheiro: formatCurrencyInput(v.custoEngenheiro),
      custoMaterialCA: formatCurrencyInput(v.custoMaterialCA),
    });
    setErro("");
  };

  // Chamar iniciarEdicao quando o panel abre
  const [lastVendaId, setLastVendaId] = useState<string | null>(null);
  if (venda && venda.id !== lastVendaId) {
    setLastVendaId(venda.id);
    iniciarEdicao(venda);
  }
  if (!venda && lastVendaId) {
    setLastVendaId(null);
  }

  const handleEditCurrency = (field: "custoCosern" | "custoVisitaTecnica" | "custoTrtCrea" | "custoEngenheiro" | "custoMaterialCA", rawValue: string) => {
    if (rawValue === "") {
      setEditFormDisplay({ ...editFormDisplay, [field]: "" });
      setEditForm({ ...editForm, [field]: 0 });
      return;
    }
    const { display, numericValue } = handleCurrencyKeyInput(rawValue);
    setEditFormDisplay({ ...editFormDisplay, [field]: display });
    setEditForm({ ...editForm, [field]: numericValue });
  };

  const salvar = async () => {
    if (!venda) return;
    setSalvando(true);
    setErro("");

    try {
      const percentualDecimal = parseFloat(editForm.percentualComissao) / 100;
      const payload = {
        quantidadePlacas: editForm.quantidadePlacas,
        quantidadeInversores: editForm.quantidadeInversores,
        custoCosern: editForm.custoCosern,
        custoVisitaTecnica: editForm.custoVisitaTecnica,
        custoTrtCrea: editForm.custoTrtCrea,
        custoEngenheiro: editForm.custoEngenheiro,
        custoMaterialCA: editForm.custoMaterialCA,
        percentualComissaoOverride: isNaN(percentualDecimal) ? undefined : percentualDecimal,
      };

      const res = await fetch(`/api/vendas/${venda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      onSaved();
      onClose();
    } catch (error: any) {
      setErro(error.message || "Erro ao salvar alteracoes");
    }
    setSalvando(false);
  };

  if (!venda) return null;

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title={`Editar Venda - ${venda.cliente}`}>
      <div className="space-y-6">
        {/* Info da Venda (read-only) */}
        <div className="bg-[#141820] rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Cliente</span>
            <span className="font-medium text-gray-100">{venda.cliente}</span>
          </div>
          {venda.vendedor && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Vendedor</span>
              <span className="text-gray-300">{venda.vendedor}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Valor da Venda</span>
            <span className="font-medium text-gray-100">{formatCurrency(venda.valorVenda)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Equipamentos</span>
            <span className="text-gray-300">{formatCurrency(venda.custoEquipamentos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Margem Atual</span>
            <span className={`font-medium ${
              venda.margemLucroLiquido >= 0.20 && venda.margemLucroLiquido <= 0.25
                ? "text-lime-400"
                : venda.margemLucroLiquido < 0.20
                ? "text-red-400"
                : "text-amber-400"
            }`}>
              {(venda.margemLucroLiquido * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Lucro Atual</span>
            <span className={`font-medium ${venda.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
              {formatCurrency(venda.lucroLiquido)}
            </span>
          </div>
        </div>

        {/* Campos Editáveis */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Custos Editaveis</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Qtd. Placas</label>
              <input
                type="number"
                min="0"
                step="1"
                value={editForm.quantidadePlacas}
                onChange={(e) => setEditForm({ ...editForm, quantidadePlacas: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Qtd. Inversores</label>
              <input
                type="number"
                min="1"
                step="1"
                value={editForm.quantidadeInversores}
                onChange={(e) => setEditForm({ ...editForm, quantidadeInversores: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Visita Tecnica (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={editFormDisplay.custoVisitaTecnica}
              onChange={(e) => handleEditCurrency("custoVisitaTecnica", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">COSERN (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editFormDisplay.custoCosern}
                onChange={(e) => handleEditCurrency("custoCosern", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">TRT/CREA (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editFormDisplay.custoTrtCrea}
                onChange={(e) => handleEditCurrency("custoTrtCrea", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Engenheiro (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editFormDisplay.custoEngenheiro}
                onChange={(e) => handleEditCurrency("custoEngenheiro", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Material CA (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editFormDisplay.custoMaterialCA}
                onChange={(e) => handleEditCurrency("custoMaterialCA", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">% Comissao</label>
            <input
              type="text"
              inputMode="decimal"
              value={editForm.percentualComissao}
              onChange={(e) => setEditForm({ ...editForm, percentualComissao: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
              placeholder="2.5"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-400/10 text-red-400 px-4 py-3 rounded-lg text-sm">
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </SlidePanel>
  );
}

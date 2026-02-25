"use client";

import { useState } from "react";
import { formatCurrency, formatCurrencyInput, handleCurrencyKeyInput } from "@/lib/utils";
import { Save, X, ChevronUp, ChevronDown, Send, CheckCircle } from "lucide-react";
import { SlidePanel } from "@/components/ui/slide-panel";

export interface VendaEditavel {
  id: string;
  cliente: string;
  vendedor?: string;
  valorVenda: number;
  custoEquipamentos: number;
  margem: number;
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
  isDiretor?: boolean;
}

const MARGEM_STEP = 0.05;
const MARGEM_MIN = 1.0;
const MARGEM_MAX = 5.0;

export function EditVendaPanel({ venda, isOpen, onClose, onSaved, isDiretor = false }: EditVendaPanelProps) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");

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

  const [novaMargem, setNovaMargem] = useState<number>(1.8);
  const [margemAlterada, setMargemAlterada] = useState(false);

  const [lastVendaId, setLastVendaId] = useState<string | null>(null);
  if (venda && venda.id !== lastVendaId) {
    setLastVendaId(venda.id);
    const percentual = venda.percentualComissaoOverride != null
      ? (venda.percentualComissaoOverride * 100).toString()
      : "2.5";
    setEditForm({
      quantidadePlacas: venda.quantidadePlacas,
      quantidadeInversores: venda.quantidadeInversores,
      custoCosern: venda.custoCosern,
      custoVisitaTecnica: venda.custoVisitaTecnica,
      custoTrtCrea: venda.custoTrtCrea,
      custoEngenheiro: venda.custoEngenheiro,
      custoMaterialCA: venda.custoMaterialCA,
      percentualComissao: percentual,
    });
    setEditFormDisplay({
      custoCosern: formatCurrencyInput(venda.custoCosern),
      custoVisitaTecnica: formatCurrencyInput(venda.custoVisitaTecnica),
      custoTrtCrea: formatCurrencyInput(venda.custoTrtCrea),
      custoEngenheiro: formatCurrencyInput(venda.custoEngenheiro),
      custoMaterialCA: formatCurrencyInput(venda.custoMaterialCA),
    });
    setNovaMargem(Math.round(venda.margem * 100) / 100);
    setMargemAlterada(false);
    setErro("");
    setSucessoMsg("");
  }
  if (!venda && lastVendaId) {
    setLastVendaId(null);
  }

  const handleEditCurrency = (
    field: "custoCosern" | "custoVisitaTecnica" | "custoTrtCrea" | "custoEngenheiro" | "custoMaterialCA",
    rawValue: string
  ) => {
    if (rawValue === "") {
      setEditFormDisplay({ ...editFormDisplay, [field]: "" });
      setEditForm({ ...editForm, [field]: 0 });
      return;
    }
    const { display, numericValue } = handleCurrencyKeyInput(rawValue);
    setEditFormDisplay({ ...editFormDisplay, [field]: display });
    setEditForm({ ...editForm, [field]: numericValue });
  };

  const ajustarMargem = (delta: number) => {
    if (!venda) return;
    const nova = Math.round((novaMargem + delta) * 100) / 100;
    if (nova < MARGEM_MIN || nova > MARGEM_MAX) return;
    setNovaMargem(nova);
    setMargemAlterada(nova !== Math.round(venda.margem * 100) / 100);
  };

  const novoCustoEquip = venda ? venda.valorVenda / novaMargem : 0;
  const variacaoCustoEquip = venda ? novoCustoEquip - venda.custoEquipamentos : 0;

  const salvarCustos = async () => {
    if (!venda) return;
    setSalvando(true);
    setErro("");
    setSucessoMsg("");
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

  const aplicarMargem = async () => {
    if (!venda || !margemAlterada) return;
    setSalvando(true);
    setErro("");
    setSucessoMsg("");
    try {
      const res = await fetch(`/api/vendas/${venda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaMargem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao aplicar margem");
      if (data.solicitacaoCriada) {
        setSucessoMsg(`Solicitacao enviada ao diretor para aprovar margem ${novaMargem.toFixed(2)}x`);
        setMargemAlterada(false);
      } else {
        onSaved();
        onClose();
      }
    } catch (error: any) {
      setErro(error.message || "Erro ao aplicar margem");
    }
    setSalvando(false);
  };

  if (!venda) return null;

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title={`Editar Venda - ${venda.cliente}`}>
      <div className="space-y-6">
        {/* Info (read-only) */}
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
            <span className="text-sm text-gray-400">Custo Equipamentos</span>
            <span className="text-gray-300">{formatCurrency(venda.custoEquipamentos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Markup / Lucro</span>
            <span className={`font-medium ${
              venda.margemLucroLiquido >= 0.20 && venda.margemLucroLiquido <= 0.25
                ? "text-lime-400"
                : venda.margemLucroLiquido < 0.20 ? "text-red-400" : "text-amber-400"
            }`}>
              {venda.margem.toFixed(2)}x / {(venda.margemLucroLiquido * 100).toFixed(1)}% lucro
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Lucro Atual</span>
            <span className={`font-medium ${venda.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
              {formatCurrency(venda.lucroLiquido)}
            </span>
          </div>
        </div>

        {/* Stepper de Margem */}
        <div className="bg-[#141820] rounded-lg p-4 border border-amber-400/20">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            Ajuste de Margem (Excecao)
            {!isDiretor && (
              <span className="text-xs font-normal text-gray-500 normal-case">— requer aprovacao do diretor</span>
            )}
          </h3>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Markup atual</p>
              <p className="text-lg font-bold text-gray-400">{venda.margem.toFixed(2)}x</p>
              <p className="text-xs text-gray-500">{formatCurrency(venda.custoEquipamentos)}</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => ajustarMargem(MARGEM_STEP)}
                disabled={novaMargem >= MARGEM_MAX}
                className="w-10 h-10 rounded-lg bg-[#232a3b] hover:bg-amber-400/20 text-gray-300 hover:text-amber-400 transition flex items-center justify-center disabled:opacity-30"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className={`text-2xl font-bold ${margemAlterada ? "text-amber-400" : "text-gray-300"}`}>
                  {novaMargem.toFixed(2)}x
                </p>
                <p className="text-xs text-gray-500">nova</p>
              </div>
              <button
                onClick={() => ajustarMargem(-MARGEM_STEP)}
                disabled={novaMargem <= MARGEM_MIN}
                className="w-10 h-10 rounded-lg bg-[#232a3b] hover:bg-amber-400/20 text-gray-300 hover:text-amber-400 transition flex items-center justify-center disabled:opacity-30"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Novo equipamentos</p>
              <p className={`text-lg font-bold ${margemAlterada ? "text-amber-400" : "text-gray-400"}`}>
                {formatCurrency(novoCustoEquip)}
              </p>
              <p className={`text-xs ${variacaoCustoEquip > 0 ? "text-lime-400" : variacaoCustoEquip < 0 ? "text-rose-400" : "text-gray-500"}`}>
                {variacaoCustoEquip !== 0 ? (variacaoCustoEquip > 0 ? "+" : "") + formatCurrency(variacaoCustoEquip) : "sem alteracao"}
              </p>
            </div>
          </div>

          {novaMargem < 1.8 && margemAlterada && (
            <div className="bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2 text-xs text-rose-400 mb-3">
              Margem {novaMargem.toFixed(2)}x abaixo do minimo (1.8x). Esta e uma excecao.
            </div>
          )}

          {sucessoMsg && (
            <div className="bg-sky-400/10 border border-sky-400/20 rounded-lg px-3 py-2 text-xs text-sky-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {sucessoMsg}
            </div>
          )}

          <button
            onClick={aplicarMargem}
            disabled={!margemAlterada || salvando}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              isDiretor
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-400/30"
            }`}
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : isDiretor ? (
              <><Save className="w-4 h-4" /> Aplicar Margem</>
            ) : (
              <><Send className="w-4 h-4" /> Solicitar Aprovacao do Diretor</>
            )}
          </button>
        </div>

        {/* Custos Operacionais */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Custos Operacionais</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Qtd. Placas</label>
              <input type="number" min="0" step="1" value={editForm.quantidadePlacas}
                onChange={(e) => setEditForm({ ...editForm, quantidadePlacas: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Qtd. Inversores</label>
              <input type="number" min="1" step="1" value={editForm.quantidadeInversores}
                onChange={(e) => setEditForm({ ...editForm, quantidadeInversores: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Visita Tecnica (R$)</label>
            <input type="text" inputMode="decimal" value={editFormDisplay.custoVisitaTecnica}
              onChange={(e) => handleEditCurrency("custoVisitaTecnica", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
              placeholder="0,00" autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">COSERN (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoCosern}
                onChange={(e) => handleEditCurrency("custoCosern", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00" autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">TRT/CREA (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoTrtCrea}
                onChange={(e) => handleEditCurrency("custoTrtCrea", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00" autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Engenheiro (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoEngenheiro}
                onChange={(e) => handleEditCurrency("custoEngenheiro", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00" autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Material CA (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoMaterialCA}
                onChange={(e) => handleEditCurrency("custoMaterialCA", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
                placeholder="0,00" autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">% Comissao</label>
            <input type="text" inputMode="decimal" value={editForm.percentualComissao}
              onChange={(e) => setEditForm({ ...editForm, percentualComissao: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#141820] text-gray-100"
              placeholder="2.5" autoComplete="off"
            />
          </div>
        </div>

        {erro && (
          <div className="bg-red-400/10 text-red-400 px-4 py-3 rounded-lg text-sm">{erro}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
          <button onClick={salvarCustos} disabled={salvando}
            className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <><Save className="w-4 h-4" /> Salvar Custos</>
            )}
          </button>
        </div>
      </div>
    </SlidePanel>
  );
}

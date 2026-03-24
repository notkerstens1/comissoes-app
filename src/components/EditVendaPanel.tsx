"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatCurrencyInput, handleCurrencyKeyInput } from "@/lib/utils";
import { Save, X, ChevronUp, ChevronDown, CheckCircle, Clock, User } from "lucide-react";
import { getRoleLabel } from "@/lib/roles";
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
  dataConversao?: string;
  comissaoVenda?: number;
  comissaoOver?: number;
  comissaoTotal?: number;
  over?: number;
  vendedorId?: string;
  mesReferencia?: string;
  excecao?: boolean;
  historicoAlteracoes?: string | null;
}

interface EditVendaPanelProps {
  venda: VendaEditavel | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  isDiretor?: boolean;
}

const MARGEM_STEP = 0.01;
const MARGEM_MIN = 1.0;
const MARGEM_MAX = 5.0;

export function EditVendaPanel({ venda, isOpen, onClose, onSaved }: EditVendaPanelProps) {
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
  const [editDataConversao, setEditDataConversao] = useState("");
  const [editValorVenda, setEditValorVenda] = useState("");
  const [editValorVendaNum, setEditValorVendaNum] = useState(0);
  const [editCustoEquip, setEditCustoEquip] = useState("");
  const [editCustoEquipNum, setEditCustoEquipNum] = useState(0);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoText, setMotivoText] = useState("");
  const [pendingAction, setPendingAction] = useState<"custos" | "margem" | null>(null);
  const [usarExcecao, setUsarExcecao] = useState(false);
  const [excecoesUsadas, setExcecoesUsadas] = useState(0);
  const [loadingExcecoes, setLoadingExcecoes] = useState(false);

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
    setEditDataConversao(venda.dataConversao ? venda.dataConversao.split("T")[0] : "");
    setEditValorVenda(formatCurrencyInput(venda.valorVenda));
    setEditValorVendaNum(venda.valorVenda);
    setEditCustoEquip(formatCurrencyInput(venda.custoEquipamentos));
    setEditCustoEquipNum(venda.custoEquipamentos);
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

  // Over = valorVenda - (custoEquip × margem aplicada)
  const overExcecao = venda ? Math.max(venda.valorVenda - venda.custoEquipamentos * novaMargem, 0) : 0;
  const comissaoOverVendedor = overExcecao * 0.35;
  const overLIV = overExcecao * 0.65;

  // Buscar exceções quando margem < 1.8
  const margemAbaixo = novaMargem < 1.8;
  useEffect(() => {
    if (!venda?.vendedorId || !venda?.mesReferencia || !margemAbaixo) return;
    setLoadingExcecoes(true);
    fetch(`/api/vendas/excecoes?vendedorId=${venda.vendedorId}&mes=${venda.mesReferencia}`)
      .then((r) => r.json())
      .then((data) => {
        let count = data.count ?? 0;
        if (venda.excecao) count = Math.max(0, count - 1);
        setExcecoesUsadas(count);
      })
      .catch(() => {})
      .finally(() => setLoadingExcecoes(false));
  }, [venda?.vendedorId, venda?.mesReferencia, margemAbaixo]);

  const excecoesDisponiveis = 2 - excecoesUsadas;
  const podeUsarExcecao = excecoesDisponiveis > 0;
  const overComExcecao = (margemAbaixo && !usarExcecao) || (margemAbaixo && !podeUsarExcecao) ? 0 : overExcecao;
  const comissaoOverComExcecao = overComExcecao * 0.35;
  const overLIVComExcecao = overComExcecao * 0.65;

  const pedirMotivo = (action: "custos" | "margem") => {
    setPendingAction(action);
    setMotivoText("");
    setShowMotivoModal(true);
  };

  const confirmarComMotivo = async () => {
    if (motivoText.trim().length < 5) return;
    setShowMotivoModal(false);
    if (pendingAction === "custos") await salvarCustos(motivoText.trim());
    else if (pendingAction === "margem") await aplicarMargem(motivoText.trim());
    setPendingAction(null);
  };

  const salvarCustos = async (motivo: string) => {
    if (!venda) return;
    setSalvando(true);
    setErro("");
    setSucessoMsg("");
    try {
      const percentualDecimal = parseFloat(editForm.percentualComissao) / 100;
      const payload: any = {
        quantidadePlacas: editForm.quantidadePlacas,
        quantidadeInversores: editForm.quantidadeInversores,
        custoCosern: editForm.custoCosern,
        custoVisitaTecnica: editForm.custoVisitaTecnica,
        custoTrtCrea: editForm.custoTrtCrea,
        custoEngenheiro: editForm.custoEngenheiro,
        custoMaterialCA: editForm.custoMaterialCA,
        percentualComissaoOverride: isNaN(percentualDecimal) ? undefined : percentualDecimal,
        motivo,
      };
      // Incluir valor da venda e custo equipamentos se foram alterados
      if (editValorVendaNum !== venda.valorVenda) {
        payload.valorVenda = editValorVendaNum;
      }
      if (editCustoEquipNum !== venda.custoEquipamentos) {
        payload.custoEquipamentos = editCustoEquipNum;
      }
      if (editDataConversao) {
        payload.dataConversao = editDataConversao;
      }
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

  const aplicarMargem = async (motivo: string) => {
    if (!venda || !margemAlterada) return;
    setSalvando(true);
    setErro("");
    setSucessoMsg("");
    try {
      const res = await fetch(`/api/vendas/${venda.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaMargem, motivo, excecao: novaMargem < 1.8 ? usarExcecao : false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao aplicar margem");
      onSaved();
      onClose();
    } catch (error: any) {
      setErro(error.message || "Erro ao aplicar margem");
    }
    setSalvando(false);
  };

  // Parse histórico
  const historico = venda?.historicoAlteracoes ? (() => {
    try { return JSON.parse(venda.historicoAlteracoes!); } catch { return []; }
  })() : [];

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
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Valor da Venda (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={editValorVenda}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { setEditValorVenda(""); setEditValorVendaNum(0); return; }
                const { display, numericValue } = handleCurrencyKeyInput(raw);
                setEditValorVenda(display);
                setEditValorVendaNum(numericValue);
              }}
              className="w-full px-3 py-2 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#0d1117] text-gray-100"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Custo Equipamentos (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={editCustoEquip}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { setEditCustoEquip(""); setEditCustoEquipNum(0); return; }
                const { display, numericValue } = handleCurrencyKeyInput(raw);
                setEditCustoEquip(display);
                setEditCustoEquipNum(numericValue);
              }}
              className="w-full px-3 py-2 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#0d1117] text-gray-100"
              placeholder="0,00"
              autoComplete="off"
            />
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
          {(venda.comissaoVenda !== undefined || venda.comissaoOver !== undefined) && (
            <div className="pt-2 border-t border-[#232a3b] space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Com. Venda (2,5%)</span>
                <span className="text-gray-300">{formatCurrency(venda.comissaoVenda || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Com. Over (35%)</span>
                <span className="text-yellow-400">{formatCurrency(venda.comissaoOver || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Total Comissão</span>
                <span className="font-medium text-lime-400">{formatCurrency(venda.comissaoTotal || 0)}</span>
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-[#232a3b]">
            <label className="block text-xs font-medium text-gray-400 mb-1">Data de Conversao</label>
            <input
              type="date"
              value={editDataConversao}
              onChange={(e) => setEditDataConversao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-amber-400/30 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-[#0d1117] text-gray-100"
            />
          </div>
        </div>

        {/* Stepper de Margem */}
        <div className="bg-[#141820] rounded-lg p-4 border border-amber-400/20">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            Ajuste de Margem (Excecao)
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
              <p className="text-xs text-gray-500 mb-1">Over</p>
              <p className={`text-lg font-bold ${margemAlterada && overComExcecao > 0 ? "text-amber-400" : "text-gray-400"}`}>
                {formatCurrency(overComExcecao)}
              </p>
            </div>
          </div>

          {/* Divisão do Over */}
          {margemAlterada && overComExcecao > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Vendedor (35%)</p>
                <p className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(comissaoOverComExcecao)}</p>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">LIV (65%)</p>
                <p className="text-sm font-bold text-lime-400 mt-0.5">{formatCurrency(overLIVComExcecao)}</p>
              </div>
            </div>
          )}

          {novaMargem < 1.8 && margemAlterada && (
            <div className="space-y-2 mb-3">
              {podeUsarExcecao ? (
                <label className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarExcecao}
                    onChange={(e) => setUsarExcecao(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400/50 text-amber-400 focus:ring-amber-400 bg-[#0d1117]"
                  />
                  <span className="text-xs text-amber-400">
                    Usar excecao ({excecoesUsadas}/2 usadas este mes)
                  </span>
                </label>
              ) : (
                <div className="bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2 text-xs text-rose-400">
                  Limite de excecoes atingido ({excecoesUsadas}/2). Over = R$0 para vendas abaixo de 1.8x.
                </div>
              )}
              {!usarExcecao && podeUsarExcecao && (
                <div className="bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2 text-xs text-rose-400">
                  Margem {novaMargem.toFixed(2)}x abaixo do minimo (1.8x). Over zerado. Marque &quot;Usar excecao&quot; para manter o over.
                </div>
              )}
            </div>
          )}

          {sucessoMsg && (
            <div className="bg-sky-400/10 border border-sky-400/20 rounded-lg px-3 py-2 text-xs text-sky-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {sucessoMsg}
            </div>
          )}

          <button
            onClick={() => pedirMotivo("margem")}
            disabled={!margemAlterada || salvando}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-600 text-white"
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <><Save className="w-4 h-4" /> Aplicar Margem</>
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
          <button onClick={() => pedirMotivo("custos")} disabled={salvando}
            className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <><Save className="w-4 h-4" /> Salvar Custos</>
            )}
          </button>
        </div>
        {/* Histórico de Alterações */}
        {historico.length > 0 && (
          <div className="bg-[#141820] rounded-lg p-4 border border-[#232a3b]">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historico de Alteracoes ({historico.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {[...historico].reverse().map((h: any, i: number) => (
                <div key={i} className="p-3 bg-[#0d1117] rounded-lg border border-[#232a3b]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <User className="w-3 h-3" />
                      {h.usuario}
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-700 text-gray-300 font-medium">
                        {getRoleLabel(h.role)}
                      </span>
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(h.data).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {h.alteracoes?.map((a: any, j: number) => (
                    <div key={j} className="text-xs text-gray-400 ml-5">
                      <span className="text-gray-500">{a.campo}:</span>{" "}
                      <span className="text-red-400/80">{typeof a.de === "number" ? a.de.toFixed(2) : String(a.de ?? "—")}</span>
                      {" → "}
                      <span className="text-emerald-400/80">{typeof a.para === "number" ? a.para.toFixed(2) : String(a.para ?? "—")}</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-1.5 ml-5 italic">&quot;{h.motivo}&quot;</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Motivo */}
      {showMotivoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] rounded-xl border border-amber-400/30 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-amber-400 mb-3">Motivo da Alteracao</h3>
            <p className="text-sm text-gray-400 mb-4">Descreva o motivo desta alteracao (obrigatorio, min. 5 caracteres).</p>
            <textarea
              value={motivoText}
              onChange={(e) => setMotivoText(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#232a3b] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-amber-400 outline-none resize-none"
              rows={3}
              placeholder="Ex: Cliente renegociou valor com o supervisor"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowMotivoModal(false); setPendingAction(null); }}
                className="flex-1 px-4 py-2 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarComMotivo}
                disabled={motivoText.trim().length < 5}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-40 text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </SlidePanel>
  );
}

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
  // Campos basicos editaveis (diretor/admin/financeiro)
  fonte?: string;             // "TRAFEGO" | "INDICACAO"
  tipoVenda?: string;         // "INBOUND" | "EXTERNA" (relevante p/ vendedor hibrido)
  distribuidora?: string;
  formaPagamento?: string;
  kwp?: number;
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
  // Campos basicos da venda (editaveis por diretor/admin/financeiro)
  const [editCliente, setEditCliente] = useState("");
  const [editFonte, setEditFonte] = useState<"TRAFEGO" | "INDICACAO" | "FOLLOWUP" | "">("");
  const [editTipoVenda, setEditTipoVenda] = useState<"INBOUND" | "EXTERNA" | "">("");
  const [editDistribuidora, setEditDistribuidora] = useState("");
  const [editFormaPagamento, setEditFormaPagamento] = useState("");
  const [editKwp, setEditKwp] = useState("");

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
    setEditCliente(venda.cliente);
    setEditFonte((venda.fonte === "TRAFEGO" || venda.fonte === "INDICACAO" || venda.fonte === "FOLLOWUP") ? venda.fonte : "");
    setEditTipoVenda((venda.tipoVenda === "INBOUND" || venda.tipoVenda === "EXTERNA") ? venda.tipoVenda : "");
    setEditDistribuidora(venda.distribuidora ?? "");
    setEditFormaPagamento(venda.formaPagamento ?? "");
    setEditKwp(venda.kwp != null ? String(venda.kwp) : "");
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
      // Campos basicos (so envia se mudou)
      if (editCliente.trim() && editCliente.trim() !== venda.cliente) {
        payload.cliente = editCliente.trim();
      }
      if (editFonte && editFonte !== venda.fonte) {
        payload.fonte = editFonte;
      }
      if (editTipoVenda && editTipoVenda !== venda.tipoVenda) {
        payload.tipoVenda = editTipoVenda;
      }
      if (editDistribuidora !== (venda.distribuidora ?? "")) {
        payload.distribuidora = editDistribuidora;
      }
      if (editFormaPagamento !== (venda.formaPagamento ?? "")) {
        payload.formaPagamento = editFormaPagamento;
      }
      const novoKwp = parseFloat(editKwp);
      if (!isNaN(novoKwp) && novoKwp !== venda.kwp) {
        payload.kwp = novoKwp;
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
        {/* Dados basicos da venda */}
        <div className="bg-liv-surface rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-liv-gold uppercase tracking-wider">Dados Basicos</h3>
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">Cliente</label>
            <input
              type="text"
              value={editCliente}
              onChange={(e) => setEditCliente(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="Nome do cliente"
            />
          </div>
          {venda.vendedor && (
            <div className="flex justify-between">
              <span className="text-sm text-liv-muted">Vendedor</span>
              <span className="text-liv-muted">{venda.vendedor}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Fonte do Lead</label>
              <select
                value={editFonte}
                onChange={(e) => setEditFonte(e.target.value as "TRAFEGO" | "INDICACAO" | "FOLLOWUP" | "")}
                className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              >
                <option value="">—</option>
                <option value="TRAFEGO">Tráfego</option>
                <option value="INDICACAO">Indicação</option>
                <option value="FOLLOWUP">Followup</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Origem da Venda</label>
              <select
                value={editTipoVenda}
                onChange={(e) => setEditTipoVenda(e.target.value as "INBOUND" | "EXTERNA" | "")}
                className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              >
                <option value="">—</option>
                <option value="INBOUND">Inbound (lead da empresa)</option>
                <option value="EXTERNA">Externa (captação própria)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Forma Pagamento</label>
              <input
                type="text"
                value={editFormaPagamento}
                onChange={(e) => setEditFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
                placeholder="Ex: Solfacil 84x"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Distribuidora</label>
              <input
                type="text"
                value={editDistribuidora}
                onChange={(e) => setEditDistribuidora(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
                placeholder="Ex: Neoenergia"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">kWp do sistema</label>
            <input
              type="number"
              step="0.01"
              value={editKwp}
              onChange={(e) => setEditKwp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="Ex: 5.50"
            />
          </div>
        </div>

        {/* Valor e custo (editaveis com recalculo automatico) */}
        <div className="bg-liv-surface rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-liv-gold uppercase tracking-wider">Valor e Custo</h3>
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">Valor da Venda (R$)</label>
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
              className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">Custo Equipamentos (R$)</label>
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
              className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="0,00"
              autoComplete="off"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-liv-muted">Markup / Lucro</span>
            <span className={`font-medium tabular-nums ${
              venda.margemLucroLiquido >= 0.20 && venda.margemLucroLiquido <= 0.25
                ? "text-liv-sage"
                : venda.margemLucroLiquido < 0.20 ? "text-liv-danger" : "text-liv-gold"
            }`}>
              {venda.margem.toFixed(2)}x / {(venda.margemLucroLiquido * 100).toFixed(1)}% lucro
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-liv-muted">Lucro Atual</span>
            <span className={`font-medium tabular-nums ${venda.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
              {formatCurrency(venda.lucroLiquido)}
            </span>
          </div>
          {(venda.comissaoVenda !== undefined || venda.comissaoOver !== undefined) && (
            <div className="pt-2 border-t border-liv-line space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-liv-muted">Com. Venda (2,5%)</span>
                <span className="text-liv-muted tabular-nums">{formatCurrency(venda.comissaoVenda || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-liv-muted">Com. Over (35%)</span>
                <span className="text-liv-gold tabular-nums">{formatCurrency(venda.comissaoOver || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-liv-muted">Total Comissão</span>
                <span className="font-medium text-liv-sage tabular-nums">{formatCurrency(venda.comissaoTotal || 0)}</span>
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-liv-line">
            <label className="block text-xs font-medium text-liv-muted mb-1">Data de Conversao</label>
            <input
              type="date"
              value={editDataConversao}
              onChange={(e) => setEditDataConversao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
            />
          </div>
        </div>

        {/* Stepper de Margem */}
        <div className="bg-liv-surface rounded-lg p-4 border border-liv-gold/20">
          <h3 className="text-sm font-semibold text-liv-gold uppercase tracking-wider mb-3 flex items-center gap-2">
            Ajuste de Margem (Excecao)
          </h3>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-center flex-1">
              <p className="text-xs text-liv-faint mb-1">Markup atual</p>
              <p className="text-lg font-bold text-liv-muted tabular-nums">{venda.margem.toFixed(2)}x</p>
              <p className="text-xs text-liv-faint tabular-nums">{formatCurrency(venda.custoEquipamentos)}</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => ajustarMargem(MARGEM_STEP)}
                disabled={novaMargem >= MARGEM_MAX}
                className="w-10 h-10 rounded-lg bg-liv-surface-2 hover:bg-liv-gold/15 text-liv-muted hover:text-liv-gold transition flex items-center justify-center disabled:opacity-30"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className={`text-2xl font-bold tabular-nums ${margemAlterada ? "text-liv-gold" : "text-liv-muted"}`}>
                  {novaMargem.toFixed(2)}x
                </p>
                <p className="text-xs text-liv-faint">nova</p>
              </div>
              <button
                onClick={() => ajustarMargem(-MARGEM_STEP)}
                disabled={novaMargem <= MARGEM_MIN}
                className="w-10 h-10 rounded-lg bg-liv-surface-2 hover:bg-liv-gold/15 text-liv-muted hover:text-liv-gold transition flex items-center justify-center disabled:opacity-30"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center flex-1">
              <p className="text-xs text-liv-faint mb-1">Over</p>
              <p className={`text-lg font-bold tabular-nums ${margemAlterada && overComExcecao > 0 ? "text-liv-gold" : "text-liv-muted"}`}>
                {formatCurrency(overComExcecao)}
              </p>
            </div>
          </div>

          {/* Divisão do Over */}
          {margemAlterada && overComExcecao > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-liv-bg rounded-lg p-3 text-center">
                <p className="text-[10px] text-liv-faint uppercase font-semibold">Vendedor (35%)</p>
                <p className="text-sm font-bold text-liv-gold tabular-nums mt-0.5">{formatCurrency(comissaoOverComExcecao)}</p>
              </div>
              <div className="bg-liv-bg rounded-lg p-3 text-center">
                <p className="text-[10px] text-liv-faint uppercase font-semibold">LIV (65%)</p>
                <p className="text-sm font-bold text-liv-sage tabular-nums mt-0.5">{formatCurrency(overLIVComExcecao)}</p>
              </div>
            </div>
          )}

          {novaMargem < 1.8 && margemAlterada && (
            <div className="space-y-2 mb-3">
              {podeUsarExcecao ? (
                <label className="flex items-center gap-2 bg-liv-gold/10 border border-liv-gold/20 rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarExcecao}
                    onChange={(e) => setUsarExcecao(e.target.checked)}
                    className="w-4 h-4 rounded border-liv-gold/50 text-liv-gold focus:ring-liv-gold bg-liv-bg"
                  />
                  <span className="text-xs text-liv-gold">
                    Usar excecao ({excecoesUsadas}/2 usadas este mes)
                  </span>
                </label>
              ) : (
                <div className="bg-liv-danger/10 border border-liv-danger/20 rounded-lg px-3 py-2 text-xs text-liv-danger">
                  Limite de excecoes atingido ({excecoesUsadas}/2). Over = R$0 para vendas abaixo de 1.8x.
                </div>
              )}
              {!usarExcecao && podeUsarExcecao && (
                <div className="bg-liv-danger/10 border border-liv-danger/20 rounded-lg px-3 py-2 text-xs text-liv-danger">
                  Margem {novaMargem.toFixed(2)}x abaixo do minimo (1.8x). Over zerado. Marque &quot;Usar excecao&quot; para manter o over.
                </div>
              )}
            </div>
          )}

          {sucessoMsg && (
            <div className="bg-liv-info/10 border border-liv-info/20 rounded-lg px-3 py-2 text-xs text-liv-info mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {sucessoMsg}
            </div>
          )}

          <button
            onClick={() => pedirMotivo("margem")}
            disabled={!margemAlterada || salvando}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-liv-sage text-liv-bg hover:bg-liv-sage-deep"
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
          <h3 className="text-sm font-semibold text-liv-gold uppercase tracking-wider">Custos Operacionais</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Qtd. Placas</label>
              <input type="number" min="0" step="1" value={editForm.quantidadePlacas}
                onChange={(e) => setEditForm({ ...editForm, quantidadePlacas: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Qtd. Inversores</label>
              <input type="number" min="1" step="1" value={editForm.quantidadeInversores}
                onChange={(e) => setEditForm({ ...editForm, quantidadeInversores: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">Visita Tecnica (R$)</label>
            <input type="text" inputMode="decimal" value={editFormDisplay.custoVisitaTecnica}
              onChange={(e) => handleEditCurrency("custoVisitaTecnica", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="0,00" autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">COSERN (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoCosern}
                onChange={(e) => handleEditCurrency("custoCosern", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
                placeholder="0,00" autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">TRT/CREA (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoTrtCrea}
                onChange={(e) => handleEditCurrency("custoTrtCrea", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
                placeholder="0,00" autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Engenheiro (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoEngenheiro}
                onChange={(e) => handleEditCurrency("custoEngenheiro", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
                placeholder="0,00" autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-liv-muted mb-1">Material CA (R$)</label>
              <input type="text" inputMode="decimal" value={editFormDisplay.custoMaterialCA}
                onChange={(e) => handleEditCurrency("custoMaterialCA", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
                placeholder="0,00" autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-liv-muted mb-1">% Comissao</label>
            <input type="text" inputMode="decimal" value={editForm.percentualComissao}
              onChange={(e) => setEditForm({ ...editForm, percentualComissao: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-liv-line focus:border-liv-sage outline-none text-sm bg-liv-surface-2 text-liv-ink"
              placeholder="2.5" autoComplete="off"
            />
          </div>
        </div>

        {erro && (
          <div className="bg-liv-danger/10 text-liv-danger px-4 py-3 rounded-lg text-sm">{erro}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-liv-line text-liv-muted font-medium hover:bg-liv-surface-2 transition flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
          <button onClick={() => pedirMotivo("custos")} disabled={salvando}
            className="flex-1 px-4 py-2.5 rounded-lg bg-liv-sage text-liv-bg font-medium hover:bg-liv-sage-deep transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-liv-bg" />
            ) : (
              <><Save className="w-4 h-4" /> Salvar Custos</>
            )}
          </button>
        </div>
        {/* Histórico de Alterações */}
        {historico.length > 0 && (
          <div className="bg-liv-surface rounded-lg p-4 border border-liv-line">
            <h3 className="text-sm font-semibold text-liv-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Historico de Alteracoes ({historico.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {[...historico].reverse().map((h: any, i: number) => (
                <div key={i} className="p-3 bg-liv-bg rounded-lg border border-liv-line">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-liv-gold">
                      <User className="w-3 h-3" />
                      {h.usuario}
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-liv-surface-2 text-liv-muted font-medium">
                        {getRoleLabel(h.role)}
                      </span>
                    </span>
                    <span className="text-[10px] text-liv-faint">
                      {new Date(h.data).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {h.alteracoes?.map((a: any, j: number) => (
                    <div key={j} className="text-xs text-liv-muted ml-5">
                      <span className="text-liv-faint">{a.campo}:</span>{" "}
                      <span className="text-liv-danger tabular-nums">{typeof a.de === "number" ? a.de.toFixed(2) : String(a.de ?? "—")}</span>
                      {" → "}
                      <span className="text-liv-sage tabular-nums">{typeof a.para === "number" ? a.para.toFixed(2) : String(a.para ?? "—")}</span>
                    </div>
                  ))}
                  <p className="text-xs text-liv-faint mt-1.5 ml-5 italic">&quot;{h.motivo}&quot;</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Motivo */}
      {showMotivoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-liv-surface rounded-xl border border-liv-gold/30 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-liv-gold mb-3">Motivo da Alteracao</h3>
            <p className="text-sm text-liv-muted mb-4">Descreva o motivo desta alteracao (obrigatorio, min. 5 caracteres).</p>
            <textarea
              value={motivoText}
              onChange={(e) => setMotivoText(e.target.value)}
              className="w-full bg-liv-bg border border-liv-line rounded-lg px-3 py-2 text-sm text-liv-ink focus:border-liv-sage outline-none resize-none"
              rows={3}
              placeholder="Ex: Cliente renegociou valor com o supervisor"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowMotivoModal(false); setPendingAction(null); }}
                className="flex-1 px-4 py-2 rounded-lg border border-liv-line text-liv-muted font-medium hover:bg-liv-surface-2 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarComMotivo}
                disabled={motivoText.trim().length < 5}
                className="flex-1 px-4 py-2 rounded-lg bg-liv-sage text-liv-bg font-medium hover:bg-liv-sage-deep transition disabled:opacity-40 text-sm"
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

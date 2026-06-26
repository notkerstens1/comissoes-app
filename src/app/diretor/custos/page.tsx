"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatCurrencyInput, handleCurrencyKeyInput } from "@/lib/utils";
import { Calculator, Save, X, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VendaCusto {
  id: string;
  cliente: string;
  vendedorId: string;
  vendedor: string;
  valorVenda: number;
  custoEquipamentos: number;
  quantidadePlacas: number;
  quantidadeInversores: number;
  custoInstalacao: number;
  custoVisitaTecnica: number;
  custoCosern: number;
  custoTrtCrea: number;
  custoEngenheiro: number;
  custoImposto: number;
  aliquotaImposto: number | null;
  percentualComissaoOverride: number | null;
  comissaoVendedor: number;
  lucroLiquido: number;
  margemLucroLiquido: number;
  margem: number;
  status: string;
}

export default function CustosPage() {
  const searchParams = useSearchParams();
  const [vendas, setVendas] = useState<VendaCusto[]>([]);
  const [vendedorFiltro, setVendedorFiltro] = useState<string | null>(() => {
    return searchParams.get("vendedor");
  });
  const [mesAtual, setMesAtual] = useState(() => {
    const mesDaUrl = searchParams.get("mes");
    if (mesDaUrl) return mesDaUrl;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
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
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchDados();
  }, [mesAtual]);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diretor/financeiro?mes=${mesAtual}`);
      const data = await res.json();
      setVendas(data.vendas || []);
    } catch (error) {
      console.error("Erro ao carregar custos:", error);
    }
    setLoading(false);
  };

  const getNomeMes = (mes: string) => {
    const [ano, m] = mes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    return `${meses[parseInt(m) - 1]} ${ano}`;
  };

  const iniciarEdicao = (venda: VendaCusto) => {
    setEditando(venda.id);
    const percentual = venda.percentualComissaoOverride != null
      ? (venda.percentualComissaoOverride * 100).toString()
      : "2.5";
    setEditForm({
      quantidadeInversores: venda.quantidadeInversores,
      custoCosern: venda.custoCosern,
      custoVisitaTecnica: venda.custoVisitaTecnica,
      custoTrtCrea: venda.custoTrtCrea,
      custoEngenheiro: venda.custoEngenheiro,
      custoMaterialCA: (venda as any).custoMaterialCA ?? 500,
      percentualComissao: percentual,
    });
    setEditFormDisplay({
      custoCosern: formatCurrencyInput(venda.custoCosern),
      custoVisitaTecnica: formatCurrencyInput(venda.custoVisitaTecnica),
      custoTrtCrea: formatCurrencyInput(venda.custoTrtCrea),
      custoEngenheiro: formatCurrencyInput(venda.custoEngenheiro),
      custoMaterialCA: formatCurrencyInput((venda as any).custoMaterialCA ?? 500),
    });
  };

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

  const salvarEdicao = async () => {
    if (!editando) return;
    setSalvando(true);

    try {
      const percentualDecimal = parseFloat(editForm.percentualComissao) / 100;
      const payload = {
        quantidadeInversores: editForm.quantidadeInversores,
        custoCosern: editForm.custoCosern,
        custoVisitaTecnica: editForm.custoVisitaTecnica,
        custoTrtCrea: editForm.custoTrtCrea,
        custoEngenheiro: editForm.custoEngenheiro,
        custoMaterialCA: editForm.custoMaterialCA,
        percentualComissaoOverride: isNaN(percentualDecimal) ? undefined : percentualDecimal,
      };
      const res = await fetch(`/api/vendas/${editando}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditando(null);
        await fetchDados(); // Recarregar dados
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
    setSalvando(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liv-gold"></div>
      </div>
    );
  }

  const margemBadge = (margem: number) => {
    if (margem >= 0.20 && margem <= 0.25) {
      return <Badge variant="sage">Margem: {(margem * 100).toFixed(1)}%</Badge>;
    }
    if (margem < 0.20) {
      return <Badge className="border-transparent bg-liv-danger/10 text-liv-danger">Margem: {(margem * 100).toFixed(1)}%</Badge>;
    }
    return <Badge variant="gold">Margem: {(margem * 100).toFixed(1)}%</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Diretoria"
        title="Custos por Venda"
        subtitle={`${getNomeMes(mesAtual)} — Edite os custos individuais de cada venda`}
        actions={
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="px-3 py-2 rounded-lg border border-liv-line bg-liv-surface text-liv-ink text-sm focus:outline-none focus:ring-2 focus:ring-liv-gold/40"
          />
        }
      />

      {/* Lista de Vendas com Edicao */}
      <div className="space-y-4">
        {vendas
          .filter((v) => !vendedorFiltro || v.vendedorId === vendedorFiltro)
          .map((venda) => (
          <Card key={venda.id} className="border-liv-line bg-liv-surface overflow-hidden">
            {/* Cabecalho da venda */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-liv-line">
              <div>
                <h3 className="font-semibold text-liv-ink">{venda.cliente}</h3>
                <p className="text-sm text-liv-muted">
                  Vendedor: {venda.vendedor} | <span className="tabular-nums">{formatCurrency(venda.valorVenda)}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {margemBadge(venda.margemLucroLiquido)}
                {editando !== venda.id && (
                  <button
                    onClick={() => iniciarEdicao(venda)}
                    className="p-2 rounded-lg hover:bg-liv-surface-2 text-liv-faint hover:text-liv-muted transition"
                    title="Editar custos"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Detalhes dos custos */}
            <CardContent className="pt-4">
              {editando === venda.id ? (
                /* Modo de edicao */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">Inversores</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.quantidadeInversores}
                        onChange={(e) => setEditForm({ ...editForm, quantidadeInversores: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">COSERN (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoCosern}
                        onChange={(e) => handleEditCurrency("custoCosern", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink tabular-nums"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">Visita Tecnica (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoVisitaTecnica}
                        onChange={(e) => handleEditCurrency("custoVisitaTecnica", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink tabular-nums"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">TRT/CREA (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoTrtCrea}
                        onChange={(e) => handleEditCurrency("custoTrtCrea", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink tabular-nums"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">Engenheiro (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoEngenheiro}
                        onChange={(e) => handleEditCurrency("custoEngenheiro", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink tabular-nums"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">Material CA (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoMaterialCA}
                        onChange={(e) => handleEditCurrency("custoMaterialCA", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink tabular-nums"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-liv-faint mb-1">% Comissao</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.percentualComissao}
                        onChange={(e) => setEditForm({ ...editForm, percentualComissao: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-liv-gold/50 focus:ring-2 focus:ring-liv-gold/40 focus:border-transparent outline-none text-sm bg-liv-surface-2 text-liv-ink tabular-nums"
                        placeholder="2.5"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditando(null)}
                      className="border-liv-line text-liv-muted hover:bg-liv-surface-2"
                    >
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={salvarEdicao}
                      disabled={salvando}
                    >
                      {salvando ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-liv-bg mr-1"></div>
                      ) : (
                        <Save className="w-3 h-3 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                /* Modo de visualizacao */
                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                  <div>
                    <p className="text-xs text-liv-faint">Equipamentos</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency(venda.custoEquipamentos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Placas</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{venda.quantidadePlacas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Inversores</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{venda.quantidadeInversores}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Instalacao</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency(venda.custoInstalacao)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Engenheiro</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency(venda.custoEngenheiro)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Material CA</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency((venda as any).custoMaterialCA ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Imposto</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency(venda.custoImposto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">COSERN</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency(venda.custoCosern)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-liv-faint">Comissao</p>
                    <p className="font-medium text-sm text-liv-ink tabular-nums">{formatCurrency(venda.comissaoVendedor)}</p>
                  </div>
                  <div className="bg-liv-surface-2 rounded-lg p-2 -m-1">
                    <p className="text-xs text-liv-faint">Lucro</p>
                    <p className={`font-bold text-sm tabular-nums ${venda.lucroLiquido >= 0 ? "text-liv-sage" : "text-liv-danger"}`}>
                      {formatCurrency(venda.lucroLiquido)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {vendas.length === 0 && (
          <Card className="border-liv-line bg-liv-surface">
            <CardContent className="py-16 text-center">
              <Calculator className="w-12 h-12 text-liv-faint mx-auto mb-4" />
              <h3 className="text-lg font-medium text-liv-ink mb-2">Nenhuma venda este mes</h3>
              <p className="text-liv-muted">Aguardando registro de vendas pelos vendedores.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatCurrencyInput, handleCurrencyKeyInput } from "@/lib/utils";
import { Calculator, Save, X, Edit3 } from "lucide-react";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-500" />
            Custos por Venda
          </h1>
          <p className="text-gray-400">{getNomeMes(mesAtual)} - Edite os custos individuais de cada venda</p>
        </div>
        <input
          type="month"
          value={mesAtual}
          onChange={(e) => setMesAtual(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 text-sm"
        />
      </div>

      {/* Lista de Vendas com Edicao */}
      <div className="space-y-4">
        {vendas
          .filter((v) => !vendedorFiltro || v.vendedorId === vendedorFiltro)
          .map((venda) => (
          <div key={venda.id} className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
            {/* Cabecalho da venda */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#232a3b]">
              <div>
                <h3 className="font-semibold text-gray-100">{venda.cliente}</h3>
                <p className="text-sm text-gray-400">Vendedor: {venda.vendedor} | {formatCurrency(venda.valorVenda)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
                  venda.margemLucroLiquido >= 0.20 && venda.margemLucroLiquido <= 0.25
                    ? "bg-lime-400/15 text-lime-400"
                    : venda.margemLucroLiquido < 0.20
                    ? "bg-red-400/10 text-red-400"
                    : "bg-amber-400/10 text-amber-400"
                }`}>
                  Margem: {(venda.margemLucroLiquido * 100).toFixed(1)}%
                </span>
                {editando !== venda.id && (
                  <button
                    onClick={() => iniciarEdicao(venda)}
                    className="p-2 rounded-lg hover:bg-[#232a3b] text-gray-400 hover:text-gray-300 transition"
                    title="Editar custos"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Detalhes dos custos */}
            <div className="px-6 py-4">
              {editando === venda.id ? (
                /* Modo de edicao */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Inversores</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.quantidadeInversores}
                        onChange={(e) => setEditForm({ ...editForm, quantidadeInversores: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">COSERN (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoCosern}
                        onChange={(e) => handleEditCurrency("custoCosern", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Visita Tecnica (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoVisitaTecnica}
                        onChange={(e) => handleEditCurrency("custoVisitaTecnica", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
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
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Engenheiro (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editFormDisplay.custoEngenheiro}
                        onChange={(e) => handleEditCurrency("custoEngenheiro", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
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
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">% Comissao</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.percentualComissao}
                        onChange={(e) => setEditForm({ ...editForm, percentualComissao: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm bg-[#141820] text-gray-100"
                        placeholder="2.5"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditando(null)}
                      className="px-4 py-2 rounded-lg border border-[#232a3b] text-gray-400 text-sm font-medium hover:bg-[#232a3b] transition flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Cancelar
                    </button>
                    <button
                      onClick={salvarEdicao}
                      disabled={salvando}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {salvando ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo de visualizacao */
                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Equipamentos</p>
                    <p className="font-medium text-sm">{formatCurrency(venda.custoEquipamentos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Placas</p>
                    <p className="font-medium text-sm">{venda.quantidadePlacas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Inversores</p>
                    <p className="font-medium text-sm">{venda.quantidadeInversores}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Instalacao</p>
                    <p className="font-medium text-sm">{formatCurrency(venda.custoInstalacao)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Engenheiro</p>
                    <p className="font-medium text-sm">{formatCurrency(venda.custoEngenheiro)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Material CA</p>
                    <p className="font-medium text-sm">{formatCurrency((venda as any).custoMaterialCA ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Imposto</p>
                    <p className="font-medium text-sm">{formatCurrency(venda.custoImposto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">COSERN</p>
                    <p className="font-medium text-sm">{formatCurrency(venda.custoCosern)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Comissao</p>
                    <p className="font-medium text-sm">{formatCurrency(venda.comissaoVendedor)}</p>
                  </div>
                  <div className="bg-[#141820] rounded-lg p-2 -m-1">
                    <p className="text-xs text-gray-400">Lucro</p>
                    <p className={`font-bold text-sm ${venda.lucroLiquido >= 0 ? "text-lime-400" : "text-red-400"}`}>
                      {formatCurrency(venda.lucroLiquido)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {vendas.length === 0 && (
          <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
            <Calculator className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-100 mb-2">Nenhuma venda este mes</h3>
            <p className="text-gray-400">Aguardando registro de vendas pelos vendedores.</p>
          </div>
        )}
      </div>
    </div>
  );
}

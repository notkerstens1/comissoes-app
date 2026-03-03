"use client";

import { useEffect, useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  DollarSign,
  Package,
  Banknote,
  TrendingUp,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface VendaFinanceiro {
  id: string;
  cliente: string;
  vendedor: string;
  vendedorId: string;
  valorVenda: number;
  custoEquipamentos: number;
  formaPagamento: string;
  distribuidora: string;
  comissaoVenda: number;
  comissaoOver: number;
  comissaoTotal: number;
  dataConversao: string;
  status: string;
}

interface DadosFinanceiro {
  vendas: VendaFinanceiro[];
  totalVendas: number;
  totalEquipamentos: number;
  totalComissoes: number;
  ticketMedio: number;
  mes: string;
}

const statusColors: Record<string, string> = {
  AGUARDANDO: "bg-yellow-400/10 text-yellow-400",
  APROVADO: "bg-lime-400/15 text-lime-400",
  PAGO: "bg-blue-400/10 text-blue-400",
};

export default function FinanceiroPage() {
  const [dados, setDados] = useState<DadosFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pagando, setPagando] = useState<string | null>(null);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/vendas?mes=${mes}`);
      if (res.ok) {
        const data = await res.json();
        setDados(data);
      }
    } catch (err) {
      console.error("Erro ao buscar dados financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [mes]);

  const marcarComoPago = async (vendaId: string) => {
    setPagando(vendaId);
    try {
      const res = await fetch("/api/financeiro/vendas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendaId }),
      });
      if (res.ok) {
        // Atualizar localmente
        setDados((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            vendas: prev.vendas.map((v) =>
              v.id === vendaId ? { ...v, status: "PAGO" } : v
            ),
          };
        });
      }
    } catch (err) {
      console.error("Erro ao marcar como pago:", err);
    } finally {
      setPagando(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Painel Financeiro</h1>
          <p className="text-gray-400">Gestao de pagamentos e comissoes</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#232a3b] bg-[#1a1f2e] text-gray-100 focus:ring-2 focus:ring-emerald-400/30 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : dados ? (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              label="Total Vendas"
              value={formatCurrency(dados.totalVendas)}
              icon={DollarSign}
              color="text-blue-400"
              bg="bg-blue-400/10"
            />
            <Card
              label="Equipamentos"
              value={formatCurrency(dados.totalEquipamentos)}
              icon={Package}
              color="text-orange-400"
              bg="bg-orange-400/10"
            />
            <Card
              label="Total Comissoes"
              value={formatCurrency(dados.totalComissoes)}
              icon={Banknote}
              color="text-emerald-400"
              bg="bg-emerald-400/10"
              highlight
            />
            <Card
              label="Ticket Medio"
              value={formatCurrency(dados.ticketMedio)}
              icon={TrendingUp}
              color="text-purple-400"
              bg="bg-purple-400/10"
            />
          </div>

          {/* Tabela */}
          <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#232a3b]">
              <h2 className="font-semibold text-gray-100">
                Vendas do Mes ({dados.vendas.length})
              </h2>
            </div>

            {dados.vendas.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Nenhuma venda neste periodo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#141820] text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 font-medium">Vendedor</th>
                      <th className="text-right px-4 py-3 font-medium">Valor Venda</th>
                      <th className="text-right px-4 py-3 font-medium">Equipamentos</th>
                      <th className="text-left px-4 py-3 font-medium">Distribuidora</th>
                      <th className="text-right px-4 py-3 font-medium">Comissao</th>
                      <th className="text-center px-4 py-3 font-medium">Data</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232a3b]">
                    {dados.vendas.map((v) => (
                      <tr key={v.id} className="hover:bg-[#232a3b]/50">
                        <td className="px-4 py-3 font-medium text-gray-100">{v.cliente}</td>
                        <td className="px-4 py-3 text-gray-300">{v.vendedor}</td>
                        <td className="px-4 py-3 text-right text-gray-100">{formatCurrency(v.valorVenda)}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(v.custoEquipamentos)}</td>
                        <td className="px-4 py-3 text-gray-300">{v.distribuidora || "-"}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-400">
                          {formatCurrency(v.comissaoTotal)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400">{formatDate(v.dataConversao)}</td>
                        <td className="px-4 py-3 text-center">
                          {v.status === "PAGO" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium bg-blue-400/10 text-blue-400">
                              <CheckCircle className="w-3 h-3" />
                              Pago
                            </span>
                          ) : v.status === "APROVADO" ? (
                            <button
                              onClick={() => marcarComoPago(v.id)}
                              disabled={pagando === v.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium bg-emerald-400 text-gray-900 hover:bg-emerald-500 transition disabled:opacity-50"
                            >
                              {pagando === v.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Banknote className="w-3 h-3" />
                              )}
                              Marcar Pago
                            </button>
                          ) : (
                            <span className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${statusColors[v.status] || "bg-[#1a1f2e] text-gray-400"}`}>
                              {v.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot className="bg-[#141820] border-t border-[#232a3b]">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-100" colSpan={2}>
                        Total ({dados.vendas.length} vendas)
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-100">
                        {formatCurrency(dados.totalVendas)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-300">
                        {formatCurrency(dados.totalEquipamentos)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        {formatCurrency(dados.totalComissoes)}
                      </td>
                      <td className="px-4 py-3" colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">Erro ao carregar dados</div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  icon: Icon,
  color,
  bg,
  highlight,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[#1a1f2e] rounded-xl p-5 border border-[#232a3b]",
        highlight && "ring-1 ring-emerald-400/30"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", bg)}>
          <Icon className={cn("w-4.5 h-4.5", color)} />
        </div>
      </div>
      <p className={cn("text-2xl font-bold", highlight ? "text-emerald-400" : "text-gray-100")}>
        {value}
      </p>
    </div>
  );
}

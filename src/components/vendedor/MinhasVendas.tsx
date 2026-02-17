"use client";

import { ShoppingCart, Plus } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";

interface Venda {
  id: string;
  data: string;
  cliente: string;
  valor: number;
  status: string;
  comissao: number;
  margem: number;
  over: number;
}

interface MinhasVendasProps {
  vendas: Venda[];
}

const statusColors: Record<string, string> = {
  AGUARDANDO: "bg-yellow-400/10 text-yellow-400",
  APROVADO: "bg-lime-400/15 text-lime-400",
  PAGO: "bg-blue-400/10 text-blue-400",
};

export function MinhasVendas({ vendas }: MinhasVendasProps) {
  if (!vendas || vendas.length === 0) {
    return (
      <div className="bg-[#1a1f2e] rounded-xl p-12 shadow-sm border border-[#232a3b] text-center">
        <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-100 mb-2">
          Nenhuma venda neste periodo
        </h3>
        <p className="text-gray-400 mb-4">
          Registre sua primeira venda para comecar a acompanhar suas comissoes.
        </p>
        <Link
          href="/vendas/nova"
          className="inline-flex items-center gap-2 bg-lime-400 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-lime-500 transition"
        >
          <Plus className="w-4 h-4" />
          Registrar Venda
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#232a3b] flex items-center justify-between">
        <h2 className="font-semibold text-gray-100">Ultimas Vendas</h2>
        <Link
          href="/vendas/nova"
          className="text-sm text-lime-400 hover:text-lime-400 font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Venda
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#141820] text-gray-400">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Data</th>
              <th className="text-left px-6 py-3 font-medium">Cliente</th>
              <th className="text-right px-6 py-3 font-medium">Valor</th>
              <th className="text-right px-6 py-3 font-medium">Margem</th>
              <th className="text-right px-6 py-3 font-medium">Over</th>
              <th className="text-right px-6 py-3 font-medium">Comissao</th>
              <th className="text-center px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232a3b]">
            {vendas.map((venda) => (
              <tr key={venda.id} className="hover:bg-[#232a3b]">
                <td className="px-6 py-3 text-gray-400">{formatDate(venda.data)}</td>
                <td className="px-6 py-3 font-medium text-gray-100">{venda.cliente}</td>
                <td className="px-6 py-3 text-right">{formatCurrency(venda.valor)}</td>
                <td className="px-6 py-3 text-right">
                  <span
                    className={
                      venda.margem < 1.8
                        ? "text-red-400 font-medium"
                        : "text-lime-400"
                    }
                  >
                    {formatNumber(venda.margem)}x
                  </span>
                </td>
                <td className="px-6 py-3 text-right">{formatCurrency(venda.over)}</td>
                <td className="px-6 py-3 text-right font-medium text-lime-400">
                  {formatCurrency(venda.comissao)}
                </td>
                <td className="px-6 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      statusColors[venda.status] || "bg-[#1a1f2e] text-gray-400"
                    }`}
                  >
                    {venda.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

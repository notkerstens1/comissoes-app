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
  AGUARDANDO: "bg-liv-gold/10 text-liv-gold",
  APROVADO: "bg-liv-sage/14 text-liv-sage",
  PAGO: "bg-liv-info/12 text-liv-info",
};

export function MinhasVendas({ vendas }: MinhasVendasProps) {
  if (!vendas || vendas.length === 0) {
    return (
      <div className="bg-liv-surface rounded-xl p-12 border border-liv-line text-center">
        <ShoppingCart className="w-12 h-12 text-liv-faint mx-auto mb-4" />
        <h3 className="text-lg font-medium text-liv-ink mb-2">
          Nenhuma venda neste periodo
        </h3>
        <p className="text-liv-muted mb-4">
          Registre sua primeira venda para comecar a acompanhar suas comissoes.
        </p>
        <Link
          href="/vendas/nova"
          className="inline-flex items-center gap-2 bg-liv-sage text-liv-bg px-6 py-3 rounded-lg font-medium hover:bg-liv-sage-deep transition"
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
    <div className="bg-liv-surface rounded-xl border border-liv-line overflow-hidden">
      <div className="px-6 py-4 border-b border-liv-line flex items-center justify-between">
        <h2 className="font-semibold text-liv-ink">Ultimas Vendas</h2>
        <Link
          href="/vendas/nova"
          className="text-sm text-liv-sage hover:text-liv-sage-deep font-medium flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Venda
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-liv-surface-2 text-liv-muted">
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
          <tbody className="divide-y divide-liv-line">
            {vendas.map((venda) => (
              <tr key={venda.id} className="hover:bg-liv-surface-2">
                <td className="px-6 py-3 text-liv-muted">{formatDate(venda.data)}</td>
                <td className="px-6 py-3 font-medium text-liv-ink">{venda.cliente}</td>
                <td className="px-6 py-3 text-right tabular-nums text-liv-ink">{formatCurrency(venda.valor)}</td>
                <td className="px-6 py-3 text-right">
                  <span
                    className={
                      venda.margem < 1.8
                        ? "text-liv-danger font-medium tabular-nums"
                        : "text-liv-sage tabular-nums"
                    }
                  >
                    {formatNumber(venda.margem)}x
                  </span>
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-liv-ink">{formatCurrency(venda.over)}</td>
                <td className="px-6 py-3 text-right font-medium text-liv-sage tabular-nums">
                  {formatCurrency(venda.comissao)}
                </td>
                <td className="px-6 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      statusColors[venda.status] || "bg-liv-surface-2 text-liv-muted"
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

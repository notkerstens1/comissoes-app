"use client";

import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { VendaSemFonte } from "./types";

interface Props {
  vendas: VendaSemFonte[];
  onClose: () => void;
}

function formatData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function VendasSemFonteModal({ vendas, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-liv-surface border border-liv-line rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-liv-line">
          <div>
            <h2 className="text-lg font-semibold text-liv-ink">Vendas sem fonte</h2>
            <p className="text-xs text-liv-muted mt-0.5">
              {vendas.length} {vendas.length === 1 ? "venda" : "vendas"} precisam ser classificadas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-liv-muted hover:text-liv-ink transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-liv-surface-2 text-xs text-liv-muted uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">Vendedor</th>
                <th className="px-5 py-3 text-left font-medium">Data</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-liv-line">
              {vendas.map((v) => (
                <tr key={v.id} className="hover:bg-liv-surface-2/50 transition-colors">
                  <td className="px-5 py-3 text-liv-ink">{v.cliente}</td>
                  <td className="px-5 py-3 text-liv-muted">{v.vendedorNome}</td>
                  <td className="px-5 py-3 text-liv-faint">{formatData(v.dataConversao)}</td>
                  <td className="px-5 py-3 text-right text-liv-ink font-medium">
                    {formatCurrency(v.valorVenda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-liv-line text-xs text-liv-faint">
          A classificação é feita na tela de edição de cada venda. Pendência herdada de vendas pré-25/mai/2026
          (quando o campo passou a ser obrigatório).
        </div>
      </div>
    </div>
  );
}

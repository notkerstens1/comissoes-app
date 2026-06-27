"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Settings } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/vendedores")
      .then((r) => r.json())
      .then(setVendedores)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Painel do Supervisor"
        subtitle="Visão geral e ações rápidas do sistema"
      />

      {/* Cards de acao rapida */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/vendedores" className="bg-liv-surface rounded-2xl p-6 border border-liv-line hover:border-liv-sage/40 transition group">
          <Users className="w-8 h-8 text-liv-violet mb-3" />
          <h3 className="font-semibold text-liv-ink group-hover:text-liv-sage transition">Vendedores</h3>
          <p className="text-sm text-liv-muted mt-1">Gerenciar equipe de vendas</p>
          <p className="text-2xl font-bold tabular-nums text-liv-ink mt-3">{vendedores.length}</p>
        </Link>

        <Link href="/admin/faixas" className="bg-liv-surface rounded-2xl p-6 border border-liv-line hover:border-liv-sage/40 transition group">
          <DollarSign className="w-8 h-8 text-liv-sage mb-3" />
          <h3 className="font-semibold text-liv-ink group-hover:text-liv-sage transition">Faixas de Comissao</h3>
          <p className="text-sm text-liv-muted mt-1">Configurar faixas progressivas</p>
        </Link>

        <Link href="/admin/configuracoes" className="bg-liv-surface rounded-2xl p-6 border border-liv-line hover:border-liv-sage/40 transition group">
          <Settings className="w-8 h-8 text-liv-info mb-3" />
          <h3 className="font-semibold text-liv-ink group-hover:text-liv-sage transition">Configuracoes</h3>
          <p className="text-sm text-liv-muted mt-1">Fator multiplicador e parametros</p>
        </Link>
      </div>

      {/* Lista de vendedores */}
      {!loading && vendedores.length > 0 && (
        <div className="bg-liv-surface rounded-2xl border border-liv-line overflow-hidden">
          <div className="px-6 py-4 border-b border-liv-line">
            <h2 className="font-semibold text-liv-ink">Equipe</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-liv-surface-2">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Nome</th>
                  <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Email</th>
                  <th className="text-center px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Perfil</th>
                  <th className="text-center px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Vendas</th>
                  <th className="text-center px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-liv-line">
                {vendedores.map((v) => (
                  <tr key={v.id} className="hover:bg-liv-surface-2 transition">
                    <td className="px-6 py-3 font-medium text-liv-ink">{v.nome}</td>
                    <td className="px-6 py-3 text-liv-muted">{v.email}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        v.role === "ADMIN" ? "bg-liv-violet/12 text-liv-violet"
                        : v.role === "DIRETOR" ? "bg-liv-gold/12 text-liv-gold"
                        : "bg-liv-sage/12 text-liv-sage"
                      }`}>
                        {v.role === "ADMIN" ? "Supervisor" : v.role === "DIRETOR" ? "Diretor" : "Vendedor"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center tabular-nums text-liv-muted">{v._count?.vendas || 0}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        v.ativo ? "bg-liv-sage/12 text-liv-sage" : "bg-liv-danger/12 text-liv-danger"
                      }`}>
                        {v.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

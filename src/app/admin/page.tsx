"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Settings } from "lucide-react";
import Link from "next/link";

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
      <h1 className="text-2xl font-bold text-gray-100">Painel do Supervisor</h1>

      {/* Cards de acao rapida */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/vendedores" className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] hover:shadow-md transition group">
          <Users className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="font-semibold text-gray-100 group-hover:text-purple-400 transition">Vendedores</h3>
          <p className="text-sm text-gray-400 mt-1">Gerenciar equipe de vendas</p>
          <p className="text-2xl font-bold text-gray-100 mt-3">{vendedores.length}</p>
        </Link>

        <Link href="/admin/faixas" className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] hover:shadow-md transition group">
          <DollarSign className="w-8 h-8 text-lime-400 mb-3" />
          <h3 className="font-semibold text-gray-100 group-hover:text-lime-400 transition">Faixas de Comissao</h3>
          <p className="text-sm text-gray-400 mt-1">Configurar faixas progressivas</p>
        </Link>

        <Link href="/admin/configuracoes" className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b] hover:shadow-md transition group">
          <Settings className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="font-semibold text-gray-100 group-hover:text-blue-400 transition">Configuracoes</h3>
          <p className="text-sm text-gray-400 mt-1">Fator multiplicador e parametros</p>
        </Link>
      </div>

      {/* Lista de vendedores */}
      {!loading && vendedores.length > 0 && (
        <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#232a3b]">
            <h2 className="font-semibold text-gray-100">Equipe</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141820]">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-400">Nome</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-400">Email</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-400">Perfil</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-400">Vendas</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3b]">
                {vendedores.map((v) => (
                  <tr key={v.id} className="hover:bg-[#232a3b]">
                    <td className="px-6 py-3 font-medium text-gray-100">{v.nome}</td>
                    <td className="px-6 py-3 text-gray-400">{v.email}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        v.role === "ADMIN" ? "bg-purple-400/15 text-purple-400"
                        : v.role === "DIRETOR" ? "bg-amber-400/15 text-amber-400"
                        : "bg-lime-400/15 text-lime-400"
                      }`}>
                        {v.role === "ADMIN" ? "Supervisor" : v.role === "DIRETOR" ? "Diretor" : "Vendedor"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">{v._count?.vendas || 0}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        v.ativo ? "bg-lime-400/15 text-lime-400" : "bg-red-100 text-red-700"
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

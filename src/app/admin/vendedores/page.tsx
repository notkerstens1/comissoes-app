"use client";

import { useEffect, useState } from "react";
import { Plus, UserCheck, UserX } from "lucide-react";

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("VENDEDOR");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    const res = await fetch("/api/admin/vendedores");
    const data = await res.json();
    setVendedores(data);
    setLoading(false);
  };

  const criarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    try {
      const res = await fetch("/api/admin/vendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setNome(""); setEmail(""); setSenha(""); setRole("VENDEDOR");
      setShowForm(false);
      fetchVendedores();
    } catch (error: any) {
      setErro(error.message);
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await fetch(`/api/admin/vendedores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativo }),
    });
    fetchVendedores();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Vendedores</h1>
          <p className="text-gray-400">Gerencie sua equipe de vendas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-lime-400 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-lime-500 transition flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Vendedor
        </button>
      </div>

      {/* Formulario de criacao */}
      {showForm && (
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <h3 className="font-semibold text-gray-100 mb-4">Novo Vendedor</h3>
          <form onSubmit={criarVendedor} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                <input
                  type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Perfil</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="SDR">SDR</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <div className="flex gap-3">
              <button type="submit" className="bg-lime-400 text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-lime-500 transition text-sm">
                Criar
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border border-[#232a3b] text-gray-400 hover:bg-[#232a3b] transition text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#1a1f2e] rounded-xl shadow-sm border border-[#232a3b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#141820]">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-400">Nome</th>
                <th className="text-left px-6 py-3 font-medium text-gray-400">Email</th>
                <th className="text-center px-6 py-3 font-medium text-gray-400">Perfil</th>
                <th className="text-center px-6 py-3 font-medium text-gray-400">Vendas</th>
                <th className="text-center px-6 py-3 font-medium text-gray-400">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232a3b]">
              {vendedores.map((v) => (
                <tr key={v.id} className="hover:bg-[#232a3b]">
                  <td className="px-6 py-3 font-medium text-gray-100">{v.nome}</td>
                  <td className="px-6 py-3 text-gray-400">{v.email}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      v.role === "ADMIN" ? "bg-purple-400/15 text-purple-400" :
                      v.role === "DIRETOR" ? "bg-amber-400/15 text-amber-400" :
                      v.role === "SDR" ? "bg-sky-400/15 text-sky-400" :
                      "bg-lime-400/15 text-lime-400"
                    }`}>{v.role === "ADMIN" ? "Supervisor" : v.role}</span>
                  </td>
                  <td className="px-6 py-3 text-center">{v._count?.vendas || 0}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      v.ativo ? "bg-lime-400/15 text-lime-400" : "bg-red-100 text-red-700"
                    }`}>{v.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => toggleAtivo(v.id, v.ativo)}
                      className={`text-sm font-medium px-3 py-1 rounded-lg transition ${
                        v.ativo
                          ? "text-red-400 hover:bg-red-400/10"
                          : "text-lime-400 hover:bg-lime-400/10"
                      }`}
                    >
                      {v.ativo ? (
                        <span className="flex items-center gap-1"><UserX className="w-3.5 h-3.5" /> Desativar</span>
                      ) : (
                        <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Ativar</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

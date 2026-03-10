"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, UserCheck, UserX, KeyRound, Trash2, X, AlertTriangle, Check } from "lucide-react";

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  _count: { vendas: number };
}

export default function VendedoresPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("VENDEDOR");
  const [erro, setErro] = useState("");

  // Alterar senha
  const [senhaEditandoId, setSenhaEditandoId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaErro, setSenhaErro] = useState("");
  const [senhaSalvando, setSenhaSalvando] = useState(false);

  // Excluir com migração
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [migrarParaId, setMigrarParaId] = useState("");
  const [excluindoErro, setExcluindoErro] = useState("");
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    setLoading(true);
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

  const salvarSenha = async (id: string) => {
    if (!novaSenha || novaSenha.length < 6) {
      setSenhaErro("Senha deve ter ao menos 6 caracteres");
      return;
    }
    setSenhaSalvando(true);
    setSenhaErro("");
    try {
      const res = await fetch(`/api/admin/vendedores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: novaSenha }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSenhaErro(data.error || "Erro ao alterar senha");
        return;
      }
      setSenhaEditandoId(null);
      setNovaSenha("");
    } catch {
      setSenhaErro("Erro ao salvar");
    }
    setSenhaSalvando(false);
  };

  const confirmarExclusao = async () => {
    if (!excluindoId || !migrarParaId) return;
    setExcluindoLoading(true);
    setExcluindoErro("");
    try {
      const res = await fetch(`/api/admin/vendedores/${excluindoId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ migrarParaId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setExcluindoErro(data.error || "Erro ao excluir");
        return;
      }
      setExcluindoId(null);
      setMigrarParaId("");
      fetchVendedores();
    } catch {
      setExcluindoErro("Erro ao excluir usuario");
    }
    setExcluindoLoading(false);
  };

  const getRoleLabel = (r: string) => {
    if (r === "ADMIN") return "Supervisor";
    if (r === "DIRETOR") return "Diretor";
    if (r === "SDR") return "SDR";
    if (r === "POS_VENDA") return "Pós Venda";
    if (r === "FINANCEIRO") return "Financeiro";
    if (r === "VENDEDOR_EXTERNO") return "Vend. Externo";
    if (r === "TECNICO") return "Engenharia";
    return "Vendedor";
  };

  const getRoleColors = (r: string) => {
    if (r === "ADMIN") return "bg-purple-400/15 text-purple-400";
    if (r === "DIRETOR") return "bg-amber-400/15 text-amber-400";
    if (r === "SDR") return "bg-sky-400/15 text-sky-400";
    if (r === "POS_VENDA") return "bg-orange-400/15 text-orange-400";
    if (r === "FINANCEIRO") return "bg-emerald-400/15 text-emerald-400";
    if (r === "TECNICO") return "bg-teal-400/15 text-teal-400";
    return "bg-lime-400/15 text-lime-400";
  };

  const excluindoUser = vendedores.find((v) => v.id === excluindoId);

  return (
    <div className="space-y-6">
      {/* Modal de exclusão */}
      {excluindoId && excluindoUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1f2e] rounded-2xl max-w-md w-full shadow-lg border border-[#232a3b]">
            <div className="p-6 border-b border-[#232a3b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-400/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-100">Excluir Usuário</h3>
                  <p className="text-sm text-gray-400">{excluindoUser.nome}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300">
                Todos os dados deste usuário (vendas, registros SDR, pós-venda, etc.) serão migrados para o usuário selecionado antes da exclusão.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Migrar dados para: *
                </label>
                <select
                  value={migrarParaId}
                  onChange={(e) => setMigrarParaId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-red-400/30 outline-none text-sm"
                >
                  <option value="">Selecione um usuário...</option>
                  {vendedores
                    .filter((v) => v.id !== excluindoId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome} ({getRoleLabel(v.role)})
                      </option>
                    ))}
                </select>
              </div>
              {excluindoErro && (
                <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{excluindoErro}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setExcluindoId(null); setMigrarParaId(""); setExcluindoErro(""); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#232a3b] text-gray-400 font-medium hover:bg-[#232a3b] transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarExclusao}
                  disabled={!migrarParaId || excluindoLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-400 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {excluindoLoading ? "Excluindo..." : (
                    <><Trash2 className="w-4 h-4" /> Confirmar Exclusão</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Time</h1>
          <p className="text-gray-400">Gerencie sua equipe</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-lime-400 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-lime-500 transition flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Membro
        </button>
      </div>

      {/* Formulario de criacao */}
      {showForm && (
        <div className="bg-[#1a1f2e] rounded-xl p-6 shadow-sm border border-[#232a3b]">
          <h3 className="font-semibold text-gray-100 mb-4">Novo Membro</h3>
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
                  <option value="VENDEDOR_EXTERNO">Vendedor Externo</option>
                  <option value="SDR">SDR</option>
                  <option value="POS_VENDA">Pós Venda</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="TECNICO">Engenharia</option>
                  <option value="ADMIN">Supervisor</option>
                  {userRole === "DIRETOR" && (
                    <option value="DIRETOR">Diretor</option>
                  )}
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
      {loading ? (
        <div className="text-center text-gray-500 py-12">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {vendedores.map((v) => (
            <div key={v.id} className="bg-[#1a1f2e] rounded-xl border border-[#232a3b] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-100">{v.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColors(v.role)}`}>
                      {getRoleLabel(v.role)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.ativo ? "bg-lime-400/15 text-lime-400" : "bg-red-400/15 text-red-400"
                    }`}>
                      {v.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{v.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{v._count?.vendas || 0} vendas</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => toggleAtivo(v.id, v.ativo)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                      v.ativo ? "text-red-400 hover:bg-red-400/10" : "text-lime-400 hover:bg-lime-400/10"
                    }`}
                  >
                    {v.ativo ? <><UserX className="w-3.5 h-3.5" /> Desativar</> : <><UserCheck className="w-3.5 h-3.5" /> Ativar</>}
                  </button>
                  <button
                    onClick={() => {
                      setSenhaEditandoId(senhaEditandoId === v.id ? null : v.id);
                      setNovaSenha("");
                      setSenhaErro("");
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 text-sky-400 hover:bg-sky-400/10"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Senha
                  </button>
                  <button
                    onClick={() => { setExcluindoId(v.id); setMigrarParaId(""); setExcluindoErro(""); }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>

              {/* Inline: alterar senha */}
              {senhaEditandoId === v.id && (
                <div className="mt-3 pt-3 border-t border-[#232a3b]">
                  <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">Nova Senha</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="flex-1 px-3 py-2 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-sky-400/30 outline-none text-sm"
                    />
                    <button
                      onClick={() => salvarSenha(v.id)}
                      disabled={senhaSalvando}
                      className="px-3 py-2 rounded-lg bg-sky-400 text-gray-900 font-medium hover:bg-sky-300 transition text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> {senhaSalvando ? "..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => { setSenhaEditandoId(null); setNovaSenha(""); setSenhaErro(""); }}
                      className="px-3 py-2 rounded-lg border border-[#232a3b] text-gray-400 hover:bg-[#232a3b] transition text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {senhaErro && <p className="text-red-400 text-xs mt-1">{senhaErro}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

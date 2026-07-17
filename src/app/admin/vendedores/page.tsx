"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, UserCheck, UserX, KeyRound, Trash2, X, AlertTriangle, Check, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ROLES_VENDEDOR_TIME } from "@/lib/roles";

const META_PADRAO = 8; // default global (Configuracao.metaVendasQtdMes)

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  metaVendasQtdMes: number | null;
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

  // Editar meta de contratos do vendedor
  const [metaEditandoId, setMetaEditandoId] = useState<string | null>(null);
  const [metaValor, setMetaValor] = useState("");
  const [metaSalvando, setMetaSalvando] = useState(false);

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

  const salvarMeta = async (id: string) => {
    setMetaSalvando(true);
    // vazio => volta pro default global (null)
    const valor = metaValor.trim() === "" ? null : Number(metaValor);
    try {
      const res = await fetch(`/api/admin/vendedores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaVendasQtdMes: valor }),
      });
      if (res.ok) {
        setMetaEditandoId(null);
        setMetaValor("");
        fetchVendedores();
      }
    } catch {
      // silencioso — mantem o editor aberto
    }
    setMetaSalvando(false);
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
    if (r === "ADMIN") return "Admin";
    if (r === "DIRETOR") return "Diretor";
    if (r === "SUPERVISOR") return "Supervisor";
    if (r === "SDR") return "SDR";
    if (r === "POS_VENDA") return "Pós Venda";
    if (r === "FINANCEIRO") return "Financeiro";
    if (r === "VENDEDOR_EXTERNO") return "Vend. Externo";
    if (r === "VENDEDOR_HIBRIDO") return "Vend. Híbrido";
    if (r === "TECNICO") return "Engenharia";
    return "Vendedor";
  };

  const getRoleColors = (r: string) => {
    if (r === "ADMIN") return "bg-liv-violet/12 text-liv-violet";
    if (r === "DIRETOR") return "bg-liv-gold/12 text-liv-gold";
    if (r === "SUPERVISOR") return "bg-liv-violet/12 text-liv-violet";
    if (r === "SDR") return "bg-liv-info/12 text-liv-info";
    if (r === "POS_VENDA") return "bg-liv-orange/12 text-liv-orange";
    if (r === "FINANCEIRO") return "bg-liv-sage/12 text-liv-sage";
    if (r === "TECNICO") return "bg-liv-teal/12 text-liv-teal";
    return "bg-liv-sage/12 text-liv-sage";
  };

  const excluindoUser = vendedores.find((v) => v.id === excluindoId);

  return (
    <div className="space-y-6">
      {/* Modal de exclusão */}
      {excluindoId && excluindoUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-liv-surface rounded-2xl max-w-md w-full border border-liv-line">
            <div className="p-6 border-b border-liv-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-liv-danger/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-liv-danger" />
                </div>
                <div>
                  <h3 className="font-bold text-liv-ink">Excluir Usuário</h3>
                  <p className="text-sm text-liv-muted">{excluindoUser.nome}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-liv-muted">
                Todos os dados deste usuário (vendas, registros SDR, pós-venda, etc.) serão migrados para o usuário selecionado antes da exclusão.
              </p>
              <div>
                <label className="block text-sm font-medium text-liv-muted mb-1">
                  Migrar dados para: *
                </label>
                <select
                  value={migrarParaId}
                  onChange={(e) => setMigrarParaId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-danger/30 outline-none text-sm"
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
                <p className="text-liv-danger text-sm bg-liv-danger/10 px-3 py-2 rounded-lg">{excluindoErro}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setExcluindoId(null); setMigrarParaId(""); setExcluindoErro(""); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-liv-line text-liv-muted font-medium hover:bg-liv-surface-2 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarExclusao}
                  disabled={!migrarParaId || excluindoLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-liv-danger text-liv-bg font-medium hover:opacity-90 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
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

      <PageHeader
        eyebrow="Administração"
        title="Time"
        subtitle="Gerencie sua equipe"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-liv-sage text-liv-bg px-4 py-2 rounded-lg font-medium hover:bg-liv-sage-deep transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Membro
          </button>
        }
      />

      {/* Formulario de criacao */}
      {showForm && (
        <div className="bg-liv-surface rounded-2xl p-6 border border-liv-line">
          <h3 className="font-semibold text-liv-ink mb-4">Novo Membro</h3>
          <form onSubmit={criarVendedor} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-liv-muted mb-1">Nome</label>
                <input
                  type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-liv-muted mb-1">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-liv-muted mb-1">Senha</label>
                <input
                  type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-liv-muted mb-1">Perfil</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage focus:border-liv-sage outline-none"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="VENDEDOR_EXTERNO">Vendedor Externo</option>
                  <option value="VENDEDOR_HIBRIDO">Vendedor Híbrido</option>
                  <option value="SDR">SDR</option>
                  <option value="POS_VENDA">Pós Venda</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="TECNICO">Engenharia</option>
                  <option value="SUPERVISOR">Supervisor (ve so comissao propria)</option>
                  <option value="ADMIN">Admin (acesso pleno)</option>
                  {userRole === "DIRETOR" && (
                    <option value="DIRETOR">Diretor</option>
                  )}
                </select>
              </div>
            </div>
            {erro && <p className="text-liv-danger text-sm">{erro}</p>}
            <div className="flex gap-3">
              <button type="submit" className="bg-liv-sage text-liv-bg px-6 py-2 rounded-lg font-medium hover:bg-liv-sage-deep transition text-sm">
                Criar
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center text-liv-faint py-12">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {vendedores.map((v) => (
            <div key={v.id} className="bg-liv-surface rounded-2xl border border-liv-line p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-liv-ink">{v.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColors(v.role)}`}>
                      {getRoleLabel(v.role)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.ativo ? "bg-liv-sage/12 text-liv-sage" : "bg-liv-danger/12 text-liv-danger"
                    }`}>
                      {v.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-liv-muted mt-0.5">{v.email}</p>
                  <p className="text-xs text-liv-faint mt-0.5 tabular-nums">
                    {v._count?.vendas || 0} vendas
                    {ROLES_VENDEDOR_TIME.includes(v.role as (typeof ROLES_VENDEDOR_TIME)[number]) && (
                      <span className="ml-2">
                        · Meta:{" "}
                        <span className="font-semibold text-liv-muted">
                          {v.metaVendasQtdMes ?? META_PADRAO} contratos/mês
                        </span>
                        {v.metaVendasQtdMes == null && <span className="text-liv-faint"> (padrão)</span>}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => toggleAtivo(v.id, v.ativo)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                      v.ativo ? "text-liv-danger hover:bg-liv-danger/10" : "text-liv-sage hover:bg-liv-sage/10"
                    }`}
                  >
                    {v.ativo ? <><UserX className="w-3.5 h-3.5" /> Desativar</> : <><UserCheck className="w-3.5 h-3.5" /> Ativar</>}
                  </button>
                  {ROLES_VENDEDOR_TIME.includes(v.role as (typeof ROLES_VENDEDOR_TIME)[number]) && (
                    <button
                      onClick={() => {
                        setMetaEditandoId(metaEditandoId === v.id ? null : v.id);
                        setMetaValor(v.metaVendasQtdMes != null ? String(v.metaVendasQtdMes) : "");
                      }}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 text-liv-sage hover:bg-liv-sage/10"
                    >
                      <Target className="w-3.5 h-3.5" /> Meta
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSenhaEditandoId(senhaEditandoId === v.id ? null : v.id);
                      setNovaSenha("");
                      setSenhaErro("");
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 text-liv-info hover:bg-liv-info/10"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Senha
                  </button>
                  <button
                    onClick={() => { setExcluindoId(v.id); setMigrarParaId(""); setExcluindoErro(""); }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 text-liv-danger hover:bg-liv-danger/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>

              {/* Inline: editar meta de contratos */}
              {metaEditandoId === v.id && (
                <div className="mt-3 pt-3 border-t border-liv-line">
                  <p className="text-xs font-semibold text-liv-sage uppercase tracking-wider mb-2">
                    Meta de contratos / mês
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={metaValor}
                      onChange={(e) => setMetaValor(e.target.value)}
                      placeholder={`Padrão: ${META_PADRAO} (consolidado 8 · novato 6)`}
                      className="flex-1 px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-sage/30 outline-none text-sm"
                    />
                    <button
                      onClick={() => salvarMeta(v.id)}
                      disabled={metaSalvando}
                      className="px-3 py-2 rounded-lg bg-liv-sage text-liv-bg font-medium hover:opacity-90 transition text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> {metaSalvando ? "..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => { setMetaEditandoId(null); setMetaValor(""); }}
                      className="px-3 py-2 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-liv-faint mt-1">Deixe vazio para usar o padrão global ({META_PADRAO}).</p>
                </div>
              )}

              {/* Inline: alterar senha */}
              {senhaEditandoId === v.id && (
                <div className="mt-3 pt-3 border-t border-liv-line">
                  <p className="text-xs font-semibold text-liv-info uppercase tracking-wider mb-2">Nova Senha</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="flex-1 px-3 py-2 rounded-lg border border-liv-line bg-liv-surface-2 text-liv-ink focus:ring-2 focus:ring-liv-info/30 outline-none text-sm"
                    />
                    <button
                      onClick={() => salvarSenha(v.id)}
                      disabled={senhaSalvando}
                      className="px-3 py-2 rounded-lg bg-liv-info text-liv-bg font-medium hover:opacity-90 transition text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> {senhaSalvando ? "..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => { setSenhaEditandoId(null); setNovaSenha(""); setSenhaErro(""); }}
                      className="px-3 py-2 rounded-lg border border-liv-line text-liv-muted hover:bg-liv-surface-2 transition text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {senhaErro && <p className="text-liv-danger text-xs mt-1">{senhaErro}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

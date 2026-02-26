"use client";

import { useState } from "react";
import { Trash2, ArrowRight, AlertTriangle, CheckCircle, Loader2, Users, Shield } from "lucide-react";

type PlanoItem = {
  usuario: { id: string; nome: string; email: string; role: string };
  acao: string;
  migrarPara: { id: string; nome: string; email: string; role: string } | null;
  dados: Record<string, number>;
};

type ResultadoItem = {
  email: string;
  acao: string;
  migradoPara: string | null;
  dados?: Record<string, number>;
  aviso?: string;
  erro?: string;
};

export default function LimpezaPage() {
  const [plano, setPlano] = useState<PlanoItem[] | null>(null);
  const [resultado, setResultado] = useState<ResultadoItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarPreview = async () => {
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch("/api/admin/cleanup-seed-users");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlano(data.plano ?? []);
    } catch (e: any) {
      setErro(e.message || "Erro ao carregar preview");
    } finally {
      setLoading(false);
    }
  };

  const executarLimpeza = async () => {
    if (!confirm("Tem certeza? Isso vai migrar os dados e remover os usuários modelo. Essa ação não pode ser desfeita.")) return;
    setExecutando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/cleanup-seed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResultado(data.resultado ?? []);
      setPlano(null);
    } catch (e: any) {
      setErro(e.message || "Erro ao executar limpeza");
    } finally {
      setExecutando(false);
    }
  };

  const totalDados = (dados: Record<string, number>) =>
    Object.values(dados).reduce((a, b) => a + b, 0);

  const acaoLabel = (acao: string) => {
    switch (acao) {
      case "MIGRAR_E_DELETAR": return { text: "Migrar e Remover", color: "text-amber-400", bg: "bg-amber-400/10" };
      case "DELETAR_DIRETO": return { text: "Remover (sem dados)", color: "text-red-400", bg: "bg-red-400/10" };
      case "SKIP_TEM_DADOS_SEM_MATCH": return { text: "Ignorar (sem correspondência)", color: "text-gray-400", bg: "bg-gray-500/10" };
      case "MIGRADO_E_DELETADO": return { text: "Migrado e Removido", color: "text-emerald-400", bg: "bg-emerald-400/10" };
      case "DELETADO_DIRETO": return { text: "Removido", color: "text-emerald-400", bg: "bg-emerald-400/10" };
      case "SKIPPED_SEM_MATCH": return { text: "Ignorado", color: "text-gray-400", bg: "bg-gray-500/10" };
      case "ERRO": return { text: "Erro", color: "text-red-400", bg: "bg-red-400/10" };
      default: return { text: acao, color: "text-gray-400", bg: "bg-gray-500/10" };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" />
          Limpeza de Usuários Duplicados
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Remove os usuários modelo (@solar.com) e migra seus dados para os usuários reais (@gmail.com)
        </p>
      </div>

      {/* Explicação */}
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300 space-y-1">
            <p><strong className="text-amber-400">O que são usuários modelo?</strong></p>
            <p>Quando o sistema foi configurado, foram criados usuários de exemplo (com email @solar.com) para demonstração. Agora que existem usuários reais (@gmail.com), esses modelos precisam ser removidos.</p>
            <p>O sistema vai migrar automaticamente todos os registros (vendas, SDR, pós-venda, etc.) do usuário modelo para o usuário real correspondente antes de removê-lo.</p>
            <p className="text-gray-500">O usuário <strong>daniel@solar.com</strong> é sempre preservado.</p>
          </div>
        </div>
      </div>

      {/* Botão de preview */}
      {!plano && !resultado && (
        <button
          onClick={carregarPreview}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
          {loading ? "Analisando..." : "Analisar Duplicados"}
        </button>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-red-400 text-sm">
          {erro}
        </div>
      )}

      {/* Preview do plano */}
      {plano && plano.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-200">
            Encontrados {plano.length} usuário(s) modelo para processar:
          </h2>

          <div className="space-y-3">
            {plano.map((item) => {
              const ac = acaoLabel(item.acao);
              return (
                <div key={item.usuario.id} className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Usuário seed */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-red-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-100 text-sm truncate">{item.usuario.nome}</p>
                        <p className="text-xs text-gray-500">{item.usuario.email}</p>
                      </div>
                    </div>

                    {/* Seta */}
                    {item.migrarPara && (
                      <>
                        <ArrowRight className="w-5 h-5 text-amber-400 flex-shrink-0" />

                        {/* Usuário real */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-emerald-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-100 text-sm truncate">{item.migrarPara.nome}</p>
                            <p className="text-xs text-gray-500">{item.migrarPara.email}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Badge de ação */}
                    <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium ${ac.bg} ${ac.color}`}>
                      {ac.text}
                    </span>
                  </div>

                  {/* Dados */}
                  {totalDados(item.dados) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(item.dados)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => (
                          <span key={k} className="text-xs bg-[#141820] text-gray-400 px-2 py-1 rounded-md">
                            {k}: <strong className="text-gray-200">{v}</strong>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={executarLimpeza}
              disabled={executando}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {executando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              {executando ? "Executando..." : "Executar Limpeza"}
            </button>
            <button
              onClick={() => setPlano(null)}
              className="px-6 py-3 bg-[#1a1f2e] border border-[#232a3b] text-gray-400 hover:text-gray-200 font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {plano && plano.length === 0 && (
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-6 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-emerald-400 font-semibold">Nenhum usuário modelo encontrado!</p>
          <p className="text-gray-400 text-sm mt-1">Todos os duplicados já foram removidos.</p>
        </div>
      )}

      {/* Resultado da execução */}
      {resultado && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Limpeza concluída!
          </h2>

          <div className="space-y-2">
            {resultado.map((item, i) => {
              const ac = acaoLabel(item.acao);
              return (
                <div key={i} className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4 flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${ac.bg} ${ac.color}`}>
                    {ac.text}
                  </span>
                  <span className="text-sm text-gray-300">{item.email}</span>
                  {item.migradoPara && (
                    <span className="text-xs text-gray-500">
                      → dados migrados para <strong className="text-emerald-400">{item.migradoPara}</strong>
                    </span>
                  )}
                  {item.aviso && (
                    <span className="text-xs text-amber-400">{item.aviso}</span>
                  )}
                  {item.erro && (
                    <span className="text-xs text-red-400">{item.erro}</span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { setResultado(null); setPlano(null); }}
            className="px-6 py-3 bg-[#1a1f2e] border border-[#232a3b] text-gray-400 hover:text-gray-200 font-semibold rounded-xl transition"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}

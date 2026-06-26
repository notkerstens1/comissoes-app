"use client";

import { useState } from "react";
import { Trash2, ArrowRight, AlertTriangle, CheckCircle, Loader2, Users, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

  const acaoLabel = (acao: string): { text: string; variant: "gold" | "destructive" | "secondary" | "sage" | "outline" } => {
    switch (acao) {
      case "MIGRAR_E_DELETAR": return { text: "Migrar e Remover", variant: "gold" };
      case "DELETAR_DIRETO": return { text: "Remover (sem dados)", variant: "destructive" };
      case "SKIP_TEM_DADOS_SEM_MATCH": return { text: "Ignorar (sem correspondência)", variant: "secondary" };
      case "MIGRADO_E_DELETADO": return { text: "Migrado e Removido", variant: "sage" };
      case "DELETADO_DIRETO": return { text: "Removido", variant: "sage" };
      case "SKIPPED_SEM_MATCH": return { text: "Ignorado", variant: "secondary" };
      case "ERRO": return { text: "Erro", variant: "destructive" };
      default: return { text: acao, variant: "outline" };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Diretoria"
        title="Limpeza de Usuários Duplicados"
        subtitle="Remove os usuários modelo (@solar.com) e migra seus dados para os usuários reais (@gmail.com)"
        actions={<Shield className="w-6 h-6 text-liv-gold" />}
      />

      {/* Explicação */}
      <Card className="border-liv-gold/20 bg-liv-gold/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-liv-gold flex-shrink-0 mt-0.5" />
            <div className="text-sm text-liv-ink space-y-1">
              <p><strong className="text-liv-gold">O que são usuários modelo?</strong></p>
              <p className="text-liv-muted">Quando o sistema foi configurado, foram criados usuários de exemplo (com email @solar.com) para demonstração. Agora que existem usuários reais (@gmail.com), esses modelos precisam ser removidos.</p>
              <p className="text-liv-muted">O sistema vai migrar automaticamente todos os registros (vendas, SDR, pós-venda, etc.) do usuário modelo para o usuário real correspondente antes de removê-lo.</p>
              <p className="text-liv-faint">O usuário <strong>daniel@solar.com</strong> é sempre preservado.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de preview */}
      {!plano && !resultado && (
        <Button
          onClick={carregarPreview}
          disabled={loading}
          size="lg"
          className="rounded-xl"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Users className="w-5 h-5 mr-2" />}
          {loading ? "Analisando..." : "Analisar Duplicados"}
        </Button>
      )}

      {/* Erro */}
      {erro && (
        <Card className="border-liv-danger/20 bg-liv-danger/5">
          <CardContent className="pt-6">
            <p className="text-liv-danger text-sm">{erro}</p>
          </CardContent>
        </Card>
      )}

      {/* Preview do plano */}
      {plano && plano.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-liv-ink">
            Encontrados {plano.length} usuário(s) modelo para processar:
          </h2>

          <div className="space-y-3">
            {plano.map((item) => {
              const ac = acaoLabel(item.acao);
              return (
                <Card key={item.usuario.id} className="border-liv-line bg-liv-surface">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Usuário seed */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-liv-danger/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Trash2 className="w-4 h-4 text-liv-danger" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-liv-ink text-sm truncate">{item.usuario.nome}</p>
                          <p className="text-xs text-liv-faint">{item.usuario.email}</p>
                        </div>
                      </div>

                      {/* Seta */}
                      {item.migrarPara && (
                        <>
                          <ArrowRight className="w-5 h-5 text-liv-gold flex-shrink-0" />

                          {/* Usuário real */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 bg-liv-sage/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-liv-sage" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-liv-ink text-sm truncate">{item.migrarPara.nome}</p>
                              <p className="text-xs text-liv-faint">{item.migrarPara.email}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Badge de ação */}
                      <Badge variant={ac.variant} className="ml-auto">
                        {ac.text}
                      </Badge>
                    </div>

                    {/* Dados */}
                    {totalDados(item.dados) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(item.dados)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => (
                            <span key={k} className="text-xs bg-liv-surface-2 border border-liv-line text-liv-muted px-2 py-1 rounded-md tabular-nums">
                              {k}: <strong className="text-liv-ink">{v}</strong>
                            </span>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              onClick={executarLimpeza}
              disabled={executando}
              variant="destructive"
              size="lg"
              className="rounded-xl"
            >
              {executando ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              {executando ? "Executando..." : "Executar Limpeza"}
            </Button>
            <Button
              onClick={() => setPlano(null)}
              variant="outline"
              size="lg"
              className="rounded-xl"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {plano && plano.length === 0 && (
        <Card className="border-liv-sage/20 bg-liv-sage/5">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-10 h-10 text-liv-sage mx-auto mb-3" />
            <p className="text-liv-sage font-semibold">Nenhum usuário modelo encontrado!</p>
            <p className="text-liv-muted text-sm mt-1">Todos os duplicados já foram removidos.</p>
          </CardContent>
        </Card>
      )}

      {/* Resultado da execução */}
      {resultado && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-liv-sage flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Limpeza concluída!
          </h2>

          <div className="space-y-2">
            {resultado.map((item, i) => {
              const ac = acaoLabel(item.acao);
              return (
                <Card key={i} className="border-liv-line bg-liv-surface">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3 flex-wrap">
                    <Badge variant={ac.variant}>
                      {ac.text}
                    </Badge>
                    <span className="text-sm text-liv-ink">{item.email}</span>
                    {item.migradoPara && (
                      <span className="text-xs text-liv-muted">
                        → dados migrados para <strong className="text-liv-sage">{item.migradoPara}</strong>
                      </span>
                    )}
                    {item.aviso && (
                      <span className="text-xs text-liv-gold">{item.aviso}</span>
                    )}
                    {item.erro && (
                      <span className="text-xs text-liv-danger">{item.erro}</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button
            onClick={() => { setResultado(null); setPlano(null); }}
            variant="outline"
            size="lg"
            className="rounded-xl"
          >
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}

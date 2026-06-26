"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Database,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function BackupPage() {
  const [baixando, setBaixando] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const baixarBackup = async () => {
    setBaixando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) throw new Error("Falha ao gerar backup");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dataStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-livenergia-${dataStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const agora = new Date().toLocaleString("pt-BR");
      setUltimoBackup(agora);
    } catch (e: any) {
      setErro(e.message ?? "Erro desconhecido");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <PageHeader
        eyebrow="Diretoria"
        title="Backup de Dados"
        subtitle="Exporte um arquivo JSON completo com todos os dados do sistema."
      />

      {/* Card principal — download manual */}
      <Card className="border-liv-line bg-liv-surface">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-liv-sage/10 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-liv-sage" />
            </div>
            <div>
              <p className="font-semibold text-liv-ink">Backup Manual</p>
              <p className="text-xs text-liv-muted">
                Gera e baixa um arquivo <code className="bg-liv-surface-2 px-1 rounded text-liv-sage">.json</code> com
                todos os usuários, vendas, SDR, pós-venda e configurações.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {erro && (
            <div className="flex items-center gap-2 bg-liv-danger/10 border border-liv-danger/30 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-liv-danger flex-shrink-0" />
              <p className="text-sm text-liv-danger">{erro}</p>
            </div>
          )}

          {ultimoBackup && !erro && (
            <div className="flex items-center gap-2 bg-liv-sage/10 border border-liv-sage/30 rounded-lg px-4 py-3">
              <CheckCircle className="w-4 h-4 text-liv-sage flex-shrink-0" />
              <p className="text-sm text-liv-sage">
                Backup baixado com sucesso em {ultimoBackup}
              </p>
            </div>
          )}

          <Button
            onClick={baixarBackup}
            disabled={baixando}
            className="flex items-center gap-2"
          >
            {baixando ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {baixando ? "Gerando backup…" : "Baixar Backup Agora"}
          </Button>
        </CardContent>
      </Card>

      {/* Card — backup automático */}
      <Card className="border-liv-line bg-liv-surface">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-liv-info/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-liv-info" />
            </div>
            <div>
              <p className="font-semibold text-liv-ink">Backup Automático Diário</p>
              <p className="text-xs text-liv-muted">
                Configure um cron externo gratuito para salvar o backup automaticamente todo dia.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-liv-muted">
            <p>
              Use o <strong className="text-liv-info">cron-job.org</strong> (gratuito) para chamar o endpoint diariamente:
            </p>

            <ol className="space-y-3 list-none">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-liv-info/10 rounded-full flex items-center justify-center text-liv-info text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <div>
                  Acesse{" "}
                  <a
                    href="https://cron-job.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-liv-info hover:underline inline-flex items-center gap-1"
                  >
                    cron-job.org <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  e crie uma conta gratuita.
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 bg-liv-info/10 rounded-full flex items-center justify-center text-liv-info text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <div>
                  Crie um novo cronjob com a URL:
                  <div className="mt-1.5 bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 font-mono text-xs text-liv-sage break-all select-all">
                    GET https://&lt;sua-url-railway&gt;/api/admin/backup
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 bg-liv-info/10 rounded-full flex items-center justify-center text-liv-info text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <div>
                  Adicione o header de autenticação:
                  <div className="mt-1.5 bg-liv-surface-2 border border-liv-line rounded-lg px-3 py-2 font-mono text-xs">
                    <span className="text-liv-gold">Authorization:</span>{" "}
                    <span className="text-liv-sage">Bearer {"<BACKUP_SECRET>"}</span>
                  </div>
                  <p className="mt-1 text-xs text-liv-faint">
                    Defina <code className="bg-liv-surface-2 px-1 rounded">BACKUP_SECRET</code> nas variáveis de ambiente do Railway com um valor secreto qualquer.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 bg-liv-info/10 rounded-full flex items-center justify-center text-liv-info text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                <div>
                  Configure para salvar a resposta (aba <em>Save responses</em>) — o cron-job.org guarda os últimos backups por você.
                  <br />
                  <span className="text-xs text-liv-faint">Frequência recomendada: diário às 03:00.</span>
                </div>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Card — o que está no backup */}
      <Card className="border-liv-line bg-liv-surface">
        <CardContent className="pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-liv-faint mb-3">
            O que o backup inclui
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "Usuários (sem senhas)",
              "Todas as vendas",
              "Registros SDR",
              "Pós-venda",
              "Configurações",
              "Faixas de comissão",
              "Solicitações de margem",
              "Campanhas",
              "Pendências",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-liv-muted">
                <CheckCircle className="w-3.5 h-3.5 text-liv-sage flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

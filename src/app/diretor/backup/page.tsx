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
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Backup de Dados
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Exporte um arquivo JSON completo com todos os dados do sistema.
        </p>
      </div>

      {/* Card principal — download manual */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-400/10 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-100">Backup Manual</p>
            <p className="text-xs text-gray-400">
              Gera e baixa um arquivo <code className="bg-[#0b0f19] px-1 rounded text-emerald-300">.json</code> com
              todos os usuários, vendas, SDR, pós-venda e configurações.
            </p>
          </div>
        </div>

        {erro && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{erro}</p>
          </div>
        )}

        {ultimoBackup && !erro && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300">
              Backup baixado com sucesso em {ultimoBackup}
            </p>
          </div>
        )}

        <button
          onClick={baixarBackup}
          disabled={baixando}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
        >
          {baixando ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {baixando ? "Gerando backup…" : "Baixar Backup Agora"}
        </button>
      </div>

      {/* Card — backup automático */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-100">Backup Automático Diário</p>
            <p className="text-xs text-gray-400">
              Configure um cron externo gratuito para salvar o backup automaticamente todo dia.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <p className="text-gray-400">
            Use o <strong className="text-sky-300">cron-job.org</strong> (gratuito) para chamar o endpoint diariamente:
          </p>

          <ol className="space-y-3 list-none">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-sky-400/10 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <div>
                Acesse{" "}
                <a
                  href="https://cron-job.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  cron-job.org <ExternalLink className="w-3 h-3" />
                </a>{" "}
                e crie uma conta gratuita.
              </div>
            </li>

            <li className="flex gap-3">
              <span className="w-6 h-6 bg-sky-400/10 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <div>
                Crie um novo cronjob com a URL:
                <div className="mt-1.5 bg-[#0b0f19] rounded-lg px-3 py-2 font-mono text-xs text-emerald-300 break-all select-all">
                  GET https://&lt;sua-url-railway&gt;/api/admin/backup
                </div>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="w-6 h-6 bg-sky-400/10 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <div>
                Adicione o header de autenticação:
                <div className="mt-1.5 bg-[#0b0f19] rounded-lg px-3 py-2 font-mono text-xs text-gray-300">
                  <span className="text-amber-300">Authorization:</span>{" "}
                  <span className="text-emerald-300">Bearer {"<BACKUP_SECRET>"}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Defina <code className="bg-[#0b0f19] px-1 rounded">BACKUP_SECRET</code> nas variáveis de ambiente do Railway com um valor secreto qualquer.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="w-6 h-6 bg-sky-400/10 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
              <div>
                Configure para salvar a resposta (aba <em>Save responses</em>) — o cron-job.org guarda os últimos backups por você.
                <br />
                <span className="text-xs text-gray-500">Frequência recomendada: diário às 03:00.</span>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Card — o que está no backup */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-6">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
            <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

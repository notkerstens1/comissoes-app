"use client";

import { AlertTriangle } from "lucide-react";

interface PipelineStage {
  etapa: string;
  quantidade: number;
}

interface Atrasado {
  id: string;
  cliente: string;
  etapa: string;
  operador: string;
  diasParado: number;
  ultimoContato: string | null;
}

const ETAPA_LABELS: Record<string, string> = {
  TRAMITES: "Tramites",
  AGUARDANDO_MATERIAL: "Aguard. Material",
  VISITA_TECNICA: "Visita Tecnica",
  AGUARDANDO_VISTORIA: "Aguard. Vistoria",
  CADASTRAR_APP: "Cadastrar App",
  ACOMPANHAMENTO_30: "Acompanhamento 30d",
  CLIENTE_FINALIZADO: "Concluido",
  MANUTENCOES: "Manutencoes",
};

const ETAPA_COLORS: Record<string, string> = {
  TRAMITES: "bg-liv-info",
  AGUARDANDO_MATERIAL: "bg-liv-gold",
  VISITA_TECNICA: "bg-liv-violet",
  AGUARDANDO_VISTORIA: "bg-liv-teal",
  CADASTRAR_APP: "bg-liv-teal",
  ACOMPANHAMENTO_30: "bg-liv-violet",
  CLIENTE_FINALIZADO: "bg-liv-sage",
  MANUTENCOES: "bg-liv-muted/50",
};

export function PosVendaPipeline({ pipeline, atrasados }: { pipeline: PipelineStage[]; atrasados: Atrasado[] }) {
  const maxQty = Math.max(...pipeline.map((p) => p.quantidade), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pipeline */}
      <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
        <h3 className="text-liv-ink font-semibold mb-4">Pipeline Pos-Venda</h3>
        <div className="space-y-3">
          {pipeline
            .filter((p) => p.etapa !== "MANUTENCOES")
            .map((stage) => {
              const width = Math.max((stage.quantidade / maxQty) * 100, 5);
              return (
                <div key={stage.etapa}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-liv-muted">{ETAPA_LABELS[stage.etapa] || stage.etapa}</span>
                    <span className="text-sm font-medium text-liv-ink">{stage.quantidade}</span>
                  </div>
                  <div className="w-full bg-liv-surface-2 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${ETAPA_COLORS[stage.etapa] || "bg-liv-muted/50"} transition-all`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Atrasados */}
      <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
        <h3 className="text-liv-ink font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-liv-gold" />
          Clientes com Atraso ({atrasados.length})
        </h3>
        {atrasados.length === 0 ? (
          <p className="text-liv-faint text-sm">Nenhum cliente com atraso &gt;15 dias</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {atrasados.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-liv-surface-2 border border-liv-gold/20">
                <div>
                  <p className="text-liv-ink text-sm font-medium">{a.cliente}</p>
                  <p className="text-xs text-liv-faint">
                    {ETAPA_LABELS[a.etapa] || a.etapa} &middot; {a.operador}
                  </p>
                </div>
                <span className="text-liv-gold text-sm font-bold">{a.diasParado}d</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

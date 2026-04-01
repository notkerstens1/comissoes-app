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
  TRAMITES: "bg-blue-500",
  AGUARDANDO_MATERIAL: "bg-amber-500",
  VISITA_TECNICA: "bg-purple-500",
  AGUARDANDO_VISTORIA: "bg-teal-500",
  CADASTRAR_APP: "bg-cyan-500",
  ACOMPANHAMENTO_30: "bg-indigo-500",
  CLIENTE_FINALIZADO: "bg-lime-500",
  MANUTENCOES: "bg-gray-500",
};

export function PosVendaPipeline({ pipeline, atrasados }: { pipeline: PipelineStage[]; atrasados: Atrasado[] }) {
  const maxQty = Math.max(...pipeline.map((p) => p.quantidade), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pipeline */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Pipeline Pos-Venda</h3>
        <div className="space-y-3">
          {pipeline
            .filter((p) => p.etapa !== "MANUTENCOES")
            .map((stage) => {
              const width = Math.max((stage.quantidade / maxQty) * 100, 5);
              return (
                <div key={stage.etapa}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">{ETAPA_LABELS[stage.etapa] || stage.etapa}</span>
                    <span className="text-sm font-medium text-white">{stage.quantidade}</span>
                  </div>
                  <div className="w-full bg-[#0b0f19] rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${ETAPA_COLORS[stage.etapa] || "bg-gray-500"} transition-all`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Atrasados */}
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Clientes com Atraso ({atrasados.length})
        </h3>
        {atrasados.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum cliente com atraso &gt;15 dias</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {atrasados.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-amber-500/20">
                <div>
                  <p className="text-white text-sm font-medium">{a.cliente}</p>
                  <p className="text-xs text-gray-500">
                    {ETAPA_LABELS[a.etapa] || a.etapa} &middot; {a.operador}
                  </p>
                </div>
                <span className="text-amber-400 text-sm font-bold">{a.diasParado}d</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Hammer,
  Calendar,
  Phone,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { getEtapaLabel, ETAPA_CORES, type EtapaPosVenda } from "@/lib/pos-venda";

type Previsao = {
  id: string;
  nomeCliente: string;
  telefone: string | null;
  etapa: string;
  previsaoMaterial: string | null;
  previsaoInstalacao: string | null;
  operador: { nome: string };
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function PrevisoesPage() {
  const [registros, setRegistros] = useState<Previsao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "material" | "instalacao">("todos");

  const hoje = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diretor/previsoes");
      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Montar lista unificada de eventos
  type Evento = {
    id: string;
    nomeCliente: string;
    telefone: string | null;
    etapa: string;
    tipo: "material" | "instalacao";
    data: string;
    operador: string;
  };

  const eventos: Evento[] = [];
  registros.forEach((r) => {
    if (r.previsaoMaterial && (filtro === "todos" || filtro === "material")) {
      eventos.push({
        id: r.id + "-mat",
        nomeCliente: r.nomeCliente,
        telefone: r.telefone,
        etapa: r.etapa,
        tipo: "material",
        data: r.previsaoMaterial,
        operador: r.operador.nome,
      });
    }
    if (r.previsaoInstalacao && (filtro === "todos" || filtro === "instalacao")) {
      eventos.push({
        id: r.id + "-inst",
        nomeCliente: r.nomeCliente,
        telefone: r.telefone,
        etapa: r.etapa,
        tipo: "instalacao",
        data: r.previsaoInstalacao,
        operador: r.operador.nome,
      });
    }
  });

  // Ordenar por data mais próxima
  eventos.sort((a, b) => a.data.localeCompare(b.data));

  // Separar: atrasados, esta semana, proximas
  const atrasados = eventos.filter((e) => e.data < hoje);
  const estaSemana = eventos.filter((e) => {
    if (e.data < hoje) return false;
    const d = new Date(e.data + "T00:00:00");
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });
  const futuras = eventos.filter((e) => {
    if (e.data < hoje) return false;
    const d = new Date(e.data + "T00:00:00");
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  });

  const countMaterial = registros.filter((r) => r.previsaoMaterial).length;
  const countInstalacao = registros.filter((r) => r.previsaoInstalacao).length;

  function renderEvento(e: Evento) {
    const cores = ETAPA_CORES[e.etapa] ?? { bg: "bg-gray-400/10", text: "text-gray-400" };
    const isMaterial = e.tipo === "material";
    const vencido = e.data < hoje;

    return (
      <div
        key={e.id}
        className={`flex items-center gap-4 p-4 rounded-xl border transition ${
          vencido
            ? "bg-rose-500/5 border-rose-500/30"
            : "bg-[#1a1f2e] border-[#232a3b] hover:border-[#2a3050]"
        }`}
      >
        {/* Ícone tipo */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isMaterial
              ? "bg-yellow-400/10 text-yellow-400"
              : "bg-violet-400/10 text-violet-400"
          }`}
        >
          {isMaterial ? <Package className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-100 truncate">
              {e.nomeCliente}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${cores.bg} ${cores.text}`}>
              {getEtapaLabel(e.etapa as EtapaPosVenda)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {e.operador}
            </span>
            {e.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {e.telefone}
              </span>
            )}
          </div>
        </div>

        {/* Data */}
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500 uppercase font-semibold">
            {isMaterial ? "Material" : "Instalação"}
          </p>
          <p
            className={`text-sm font-bold flex items-center gap-1.5 justify-end ${
              vencido ? "text-rose-400" : "text-gray-100"
            }`}
          >
            {vencido && <AlertCircle className="w-3.5 h-3.5" />}
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            {formatDate(e.data)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-amber-400" />
                Previsões
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Chegada de material e instalações previstas
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-[#232a3b] text-gray-300 rounded-lg text-sm hover:bg-[#2a3040] transition"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Atrasados</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">{atrasados.length}</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1.5">
                <Package className="w-3 h-3 text-yellow-400" />
                Material Previsto
              </p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{countMaterial}</p>
            </div>
            <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1.5">
                <Hammer className="w-3 h-3 text-violet-400" />
                Instalações Previstas
              </p>
              <p className="text-2xl font-bold text-violet-400 mt-1">{countInstalacao}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-6">
            {([
              ["todos", "Todos"],
              ["material", "Material"],
              ["instalacao", "Instalação"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  filtro === key
                    ? "bg-amber-400 text-gray-900"
                    : "bg-[#232a3b] text-gray-300 hover:bg-[#2a3040]"
                }`}
              >
                {label} ({key === "todos" ? eventos.length : key === "material" ? countMaterial : countInstalacao})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-12">Carregando previsões...</div>
          ) : eventos.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-[#1a1f2e] rounded-xl border border-[#232a3b]">
              Nenhuma previsão cadastrada pelo pós-venda
            </div>
          ) : (
            <div className="space-y-6">
              {/* Atrasados */}
              {atrasados.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Atrasados ({atrasados.length})
                  </h2>
                  <div className="space-y-2">
                    {atrasados.map(renderEvento)}
                  </div>
                </div>
              )}

              {/* Esta semana */}
              {estaSemana.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                    Próximos 7 dias ({estaSemana.length})
                  </h2>
                  <div className="space-y-2">
                    {estaSemana.map(renderEvento)}
                  </div>
                </div>
              )}

              {/* Futuras */}
              {futuras.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Futuras ({futuras.length})
                  </h2>
                  <div className="space-y-2">
                    {futuras.map(renderEvento)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

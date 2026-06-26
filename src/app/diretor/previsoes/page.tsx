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
import { getEtapaLabel, ETAPA_CORES, type EtapaPosVenda } from "@/lib/pos-venda";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    const cores = ETAPA_CORES[e.etapa] ?? { bg: "bg-liv-surface-2", text: "text-liv-faint" };
    const isMaterial = e.tipo === "material";
    const vencido = e.data < hoje;

    return (
      <div
        key={e.id}
        className={`flex items-center gap-4 p-4 rounded-xl border transition ${
          vencido
            ? "bg-liv-danger/5 border-liv-danger/30"
            : "bg-liv-surface border-liv-line hover:border-liv-line/80"
        }`}
      >
        {/* Ícone tipo */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isMaterial
              ? "bg-liv-gold/10 text-liv-gold"
              : "bg-liv-violet/10 text-liv-violet"
          }`}
        >
          {isMaterial ? <Package className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-liv-ink truncate">
              {e.nomeCliente}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${cores.bg} ${cores.text}`}>
              {getEtapaLabel(e.etapa as EtapaPosVenda)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-liv-faint">
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
          <p className="text-xs text-liv-faint uppercase font-semibold">
            {isMaterial ? "Material" : "Instalação"}
          </p>
          <p
            className={`text-sm font-bold tabular-nums flex items-center gap-1.5 justify-end ${
              vencido ? "text-liv-danger" : "text-liv-ink"
            }`}
          >
            {vencido && <AlertCircle className="w-3.5 h-3.5" />}
            <Calendar className="w-3.5 h-3.5 text-liv-faint" />
            {formatDate(e.data)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Diretoria"
        title="Previsões"
        subtitle="Chegada de material e instalações previstas"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        }
      />

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-liv-faint uppercase font-semibold tracking-wide">Atrasados</p>
            <p className="text-2xl font-bold tabular-nums text-liv-danger mt-1">{atrasados.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-liv-faint uppercase font-semibold tracking-wide flex items-center gap-1.5">
              <Package className="w-3 h-3 text-liv-gold" />
              Material Previsto
            </p>
            <p className="text-2xl font-bold tabular-nums text-liv-gold mt-1">{countMaterial}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-liv-faint uppercase font-semibold tracking-wide flex items-center gap-1.5">
              <Hammer className="w-3 h-3 text-liv-violet" />
              Instalações Previstas
            </p>
            <p className="text-2xl font-bold tabular-nums text-liv-violet mt-1">{countInstalacao}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
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
                ? "bg-liv-gold text-liv-bg"
                : "bg-liv-surface border border-liv-line text-liv-muted hover:border-liv-gold/40 hover:text-liv-ink"
            }`}
          >
            {label} ({key === "todos" ? eventos.length : key === "material" ? countMaterial : countInstalacao})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-liv-muted py-12">Carregando previsões...</div>
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-liv-muted">Nenhuma previsão cadastrada pelo pós-venda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Atrasados */}
          {atrasados.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-liv-danger uppercase tracking-wider mb-3 flex items-center gap-2">
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
              <h2 className="text-sm font-bold text-liv-sage uppercase tracking-wider mb-3">
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
              <h2 className="text-sm font-bold text-liv-muted uppercase tracking-wider mb-3">
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
  );
}

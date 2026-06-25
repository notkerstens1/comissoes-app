"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";
import { isAdmin } from "@/lib/roles";
import { Target, Calendar, Plus, Pencil, Trophy, Users } from "lucide-react";
import { CampanhaFormModal } from "./CampanhaFormModal";

interface Campanha {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  escopo: string;
  meta: number;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  criadoPor?: { nome: string };
}

interface ProgressoTime {
  atual: number;
  meta: number;
  percentual: number;
}

interface ProgressoIndividualItem {
  vendedorId: string;
  vendedorNome: string;
  atual: number;
  meta: number;
  percentual: number;
}

interface Progresso {
  campanhaId: string;
  tipo: string;
  escopo: string;
  meta: number;
  diasRestantes: number;
  encerrada: boolean;
  progressoTime?: ProgressoTime;
  progressoIndividual?: ProgressoIndividualItem[];
}

interface Props {
  userRole?: string;
}

export function CampanhasSection({ userRole }: Props) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [progressos, setProgressos] = useState<Record<string, Progresso>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editCampanha, setEditCampanha] = useState<Campanha | null>(null);

  const canManage = isAdmin(userRole);

  const fetchCampanhas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campanhas?ativas=true");
      if (res.ok) {
        const data: Campanha[] = await res.json();
        setCampanhas(data);

        // Buscar progresso de cada campanha em paralelo
        const progressoMap: Record<string, Progresso> = {};
        await Promise.all(
          data.map(async (c) => {
            try {
              const pRes = await fetch(`/api/campanhas/${c.id}/progresso`);
              if (pRes.ok) {
                progressoMap[c.id] = await pRes.json();
              }
            } catch {
              // Ignora erros individuais
            }
          })
        );
        setProgressos(progressoMap);
      }
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampanhas();
  }, [fetchCampanhas]);

  const handleEdit = (campanha: Campanha) => {
    setEditCampanha(campanha);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditCampanha(null);
    setFormOpen(true);
  };

  const handleSaved = () => {
    fetchCampanhas();
  };

  const getProgressColor = (percentual: number) => {
    if (percentual >= 70) return "bg-liv-sage";
    if (percentual >= 40) return "bg-liv-sand";
    return "bg-liv-faint";
  };

  const formatMeta = (tipo: string, valor: number) => {
    if (tipo === "VALOR") return formatCurrency(valor);
    return `${valor} vendas`;
  };

  const formatAtual = (tipo: string, valor: number) => {
    if (tipo === "VALOR") return formatCurrency(valor);
    return `${valor}`;
  };

  // Sem campanhas = nao mostra nada (evita poluicao visual)
  if (!loading && campanhas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-liv-sage" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-liv-muted">
            Campanhas
          </h2>
        </div>
        {canManage && (
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 text-xs font-medium text-liv-sage transition hover:text-liv-ink"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova campanha
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-liv-line border-t-liv-sage" />
        </div>
      )}

      {/* Cards de campanhas */}
      {!loading && campanhas.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {campanhas.map((campanha, idx) => {
            const prog = progressos[campanha.id];
            const percentual = prog?.progressoTime?.percentual || 0;
            const atual = prog?.progressoTime?.atual || 0;
            const diasRestantes = prog?.diasRestantes ?? 0;

            return (
              <div
                key={campanha.id}
                className="liv-rise rounded-2xl border border-liv-line bg-liv-surface p-4 transition-colors hover:border-liv-line/60"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Top row: titulo + badges + edit */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-liv-ink">
                      {campanha.titulo}
                    </h3>
                    {campanha.descricao && (
                      <p className="mt-0.5 truncate text-xs text-liv-faint">
                        {campanha.descricao}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* Type badge */}
                    <span className="rounded-full bg-liv-sage/12 px-2 py-0.5 text-[10px] font-medium text-liv-sage">
                      {campanha.tipo === "VALOR" ? "R$" : "Qtd"}
                    </span>
                    {/* Scope badge */}
                    <span className="flex items-center gap-0.5 rounded-full bg-liv-surface-2 px-2 py-0.5 text-[10px] font-medium text-liv-muted">
                      {campanha.escopo === "TIME" ? (
                        <>
                          <Users className="h-2.5 w-2.5" />
                          Time
                        </>
                      ) : (
                        <>
                          <Trophy className="h-2.5 w-2.5" />
                          Individual
                        </>
                      )}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleEdit(campanha)}
                        className="rounded-lg p-1 text-liv-faint transition hover:bg-liv-surface-2 hover:text-liv-ink"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress para TIME */}
                {campanha.escopo === "TIME" && prog?.progressoTime && (
                  <>
                    {/* Progress bar */}
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-liv-surface-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getProgressColor(
                          percentual
                        )}`}
                        style={{ width: `${Math.min(percentual, 100)}%` }}
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium tabular-nums text-liv-muted">
                        {formatAtual(campanha.tipo, atual)}{" "}
                        <span className="text-liv-faint">
                          / {formatMeta(campanha.tipo, campanha.meta)}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums text-liv-sage">
                        {percentual.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}

                {/* Progress para INDIVIDUAL */}
                {campanha.escopo === "INDIVIDUAL" &&
                  prog?.progressoIndividual && (
                    <div className="mb-2 space-y-1.5">
                      {prog.progressoIndividual.slice(0, 4).map((pi) => (
                        <div key={pi.vendedorId}>
                          <div className="mb-0.5 flex items-center justify-between text-xs">
                            <span className="truncate text-liv-muted">
                              {pi.vendedorNome}
                            </span>
                            <span className="ml-2 shrink-0 font-medium tabular-nums text-liv-ink">
                              {pi.percentual.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-liv-surface-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                                pi.percentual
                              )}`}
                              style={{ width: `${Math.min(pi.percentual, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {prog.progressoIndividual.length > 4 && (
                        <p className="text-[10px] text-liv-faint">
                          +{prog.progressoIndividual.length - 4} vendedores
                        </p>
                      )}
                    </div>
                  )}

                {/* Footer: datas + dias restantes */}
                <div className="mt-2 flex items-center justify-between border-t border-liv-line pt-2">
                  <span className="flex items-center gap-1 text-[10px] text-liv-faint">
                    <Calendar className="h-3 w-3" />
                    {formatDateShort(campanha.dataInicio)} -{" "}
                    {formatDateShort(campanha.dataFim)}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      diasRestantes <= 3
                        ? "text-liv-danger"
                        : diasRestantes <= 7
                        ? "text-liv-sand"
                        : "text-liv-faint"
                    }`}
                  >
                    {diasRestantes === 0
                      ? "Último dia!"
                      : `${diasRestantes} dias restantes`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <CampanhaFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditCampanha(null);
        }}
        campanha={editCampanha}
        onSaved={handleSaved}
      />
    </div>
  );
}

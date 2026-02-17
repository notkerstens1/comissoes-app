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
    if (percentual >= 100) return "bg-lime-400";
    if (percentual >= 70) return "bg-lime-400";
    if (percentual >= 40) return "bg-yellow-400";
    return "bg-orange-400";
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
          <Target className="w-4 h-4 text-lime-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Campanhas
          </h2>
        </div>
        {canManage && (
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 text-xs font-medium text-lime-400 hover:text-lime-300 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Campanha
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-400" />
        </div>
      )}

      {/* Cards de campanhas */}
      {!loading && campanhas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campanhas.map((campanha) => {
            const prog = progressos[campanha.id];
            const percentual = prog?.progressoTime?.percentual || 0;
            const atual = prog?.progressoTime?.atual || 0;
            const diasRestantes = prog?.diasRestantes ?? 0;

            return (
              <div
                key={campanha.id}
                className="bg-[#1a1f2e] rounded-xl p-4 border border-[#232a3b] hover:border-[#2d3548] transition"
              >
                {/* Top row: titulo + badges + edit */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-100 text-sm truncate">
                      {campanha.titulo}
                    </h3>
                    {campanha.descricao && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {campanha.descricao}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Type badge */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-400 font-medium">
                      {campanha.tipo === "VALOR" ? "R$" : "Qtd"}
                    </span>
                    {/* Scope badge */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 font-medium flex items-center gap-0.5">
                      {campanha.escopo === "TIME" ? (
                        <>
                          <Users className="w-2.5 h-2.5" />
                          Time
                        </>
                      ) : (
                        <>
                          <Trophy className="w-2.5 h-2.5" />
                          Individual
                        </>
                      )}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleEdit(campanha)}
                        className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-[#232a3b] transition"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress para TIME */}
                {campanha.escopo === "TIME" && prog?.progressoTime && (
                  <>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-[#232a3b] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getProgressColor(
                          percentual
                        )}`}
                        style={{
                          width: `${Math.min(percentual, 100)}%`,
                        }}
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-medium">
                        {formatAtual(campanha.tipo, atual)}{" "}
                        <span className="text-gray-500">
                          / {formatMeta(campanha.tipo, campanha.meta)}
                        </span>
                      </span>
                      <span className="font-bold text-lime-400">
                        {percentual.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}

                {/* Progress para INDIVIDUAL */}
                {campanha.escopo === "INDIVIDUAL" &&
                  prog?.progressoIndividual && (
                    <div className="space-y-1.5 mb-2">
                      {prog.progressoIndividual.slice(0, 4).map((pi) => (
                        <div key={pi.vendedorId}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-gray-400 truncate">
                              {pi.vendedorNome}
                            </span>
                            <span className="text-gray-300 font-medium shrink-0 ml-2">
                              {pi.percentual.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#232a3b] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                                pi.percentual
                              )}`}
                              style={{
                                width: `${Math.min(pi.percentual, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      {prog.progressoIndividual.length > 4 && (
                        <p className="text-[10px] text-gray-500">
                          +{prog.progressoIndividual.length - 4} vendedores
                        </p>
                      )}
                    </div>
                  )}

                {/* Footer: datas + dias restantes */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#232a3b]/50">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDateShort(campanha.dataInicio)} -{" "}
                    {formatDateShort(campanha.dataFim)}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      diasRestantes <= 3
                        ? "text-red-400"
                        : diasRestantes <= 7
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {diasRestantes === 0
                      ? "Ultimo dia!"
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

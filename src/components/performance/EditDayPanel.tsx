"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, Save } from "lucide-react";
import { SlidePanel } from "@/components/ui/slide-panel";
import { TrafficForm } from "@/components/performance/TrafficForm";
import { CommercialTable } from "@/components/performance/CommercialTable";
import { formatDateDisplay } from "@/lib/dates";

interface TrafficData {
  pessoasAlcancadas: number;
  totalLeads: number;
  valorInvestidoVendas: number;
  valorInvestidoBranding: number;
  valorGasto: number;
}

interface VendorCommercial {
  vendedorId: string;
  nome: string;
  atendidos: number;
  mql: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  valorEmVendas: number;
  leadsDescartados: number;
}

interface EditDayPanelProps {
  date: string | null;
  onClose: () => void;
  onSave: () => void;
  canEditTraffic: boolean;
  canEditCommercial: boolean;
}

const emptyTraffic: TrafficData = {
  pessoasAlcancadas: 0,
  totalLeads: 0,
  valorInvestidoVendas: 0,
  valorInvestidoBranding: 0,
  valorGasto: 0,
};

export function EditDayPanel({
  date,
  onClose,
  onSave,
  canEditTraffic,
  canEditCommercial,
}: EditDayPanelProps) {
  const [traffic, setTraffic] = useState<TrafficData>(emptyTraffic);
  const [commercials, setCommercials] = useState<VendorCommercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch day data when date changes
  useEffect(() => {
    if (!date) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/performance/day?date=${date}`);
        if (!res.ok) throw new Error("Erro ao buscar dados do dia");
        const data = await res.json();

        // Set traffic data
        if (data.traffic) {
          setTraffic({
            pessoasAlcancadas: data.traffic.pessoasAlcancadas ?? 0,
            totalLeads: data.traffic.totalLeads ?? 0,
            valorInvestidoVendas: data.traffic.valorInvestidoVendas ?? 0,
            valorInvestidoBranding: data.traffic.valorInvestidoBranding ?? 0,
            valorGasto: data.traffic.valorGasto ?? 0,
          });
        } else {
          setTraffic(emptyTraffic);
        }

        // Build commercial data: merge vendors list with existing commercials
        const existingMap = new Map<string, any>();
        if (data.commercials) {
          for (const c of data.commercials) {
            existingMap.set(c.vendedorId, c);
          }
        }

        const vendorList: VendorCommercial[] = (data.vendors ?? []).map(
          (v: { id: string; nome: string }) => {
            const existing = existingMap.get(v.id);
            return {
              vendedorId: v.id,
              nome: v.nome,
              atendidos: existing?.atendidos ?? 0,
              mql: existing?.mql ?? 0,
              reunioes: existing?.reunioes ?? 0,
              propostas: existing?.propostas ?? 0,
              fechados: existing?.fechados ?? 0,
              valorEmVendas: existing?.valorEmVendas ?? 0,
              leadsDescartados: existing?.leadsDescartados ?? 0,
            };
          }
        );

        setCommercials(vendorList);
      } catch (err) {
        console.error("Erro ao carregar dados do dia:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]);

  const handleCopyPrevious = async () => {
    if (!date) return;

    // Calculate previous day
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const sourceDate = d.toISOString().split("T")[0];

    setSaving(true);
    try {
      const res = await fetch("/api/performance/copy-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDate, targetDate: date }),
      });

      if (!res.ok) throw new Error("Erro ao copiar dia anterior");

      // Re-fetch data to reflect copied values
      const fetchRes = await fetch(`/api/performance/day?date=${date}`);
      if (fetchRes.ok) {
        const data = await fetchRes.json();

        if (data.traffic) {
          setTraffic({
            pessoasAlcancadas: data.traffic.pessoasAlcancadas ?? 0,
            totalLeads: data.traffic.totalLeads ?? 0,
            valorInvestidoVendas: data.traffic.valorInvestidoVendas ?? 0,
            valorInvestidoBranding: data.traffic.valorInvestidoBranding ?? 0,
            valorGasto: data.traffic.valorGasto ?? 0,
          });
        }

        const existingMap = new Map<string, any>();
        if (data.commercials) {
          for (const c of data.commercials) {
            existingMap.set(c.vendedorId, c);
          }
        }

        const vendorList: VendorCommercial[] = (data.vendors ?? []).map(
          (v: { id: string; nome: string }) => {
            const existing = existingMap.get(v.id);
            return {
              vendedorId: v.id,
              nome: v.nome,
              atendidos: existing?.atendidos ?? 0,
              mql: existing?.mql ?? 0,
              reunioes: existing?.reunioes ?? 0,
              propostas: existing?.propostas ?? 0,
              fechados: existing?.fechados ?? 0,
              valorEmVendas: existing?.valorEmVendas ?? 0,
              leadsDescartados: existing?.leadsDescartados ?? 0,
            };
          }
        );

        setCommercials(vendorList);
      }
    } catch (err) {
      console.error("Erro ao copiar dia anterior:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!date) return;

    setSaving(true);
    try {
      const body: any = { date };

      if (canEditTraffic) {
        body.traffic = traffic;
      }

      if (canEditCommercial) {
        body.commercials = commercials.map((v) => ({
          vendedorId: v.vendedorId,
          atendidos: v.atendidos,
          mql: v.mql,
          reunioes: v.reunioes,
          propostas: v.propostas,
          fechados: v.fechados,
          valorEmVendas: v.valorEmVendas,
          leadsDescartados: v.leadsDescartados,
        }));
      }

      const res = await fetch("/api/performance/day", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      onSave();
    } catch (err) {
      console.error("Erro ao salvar dados do dia:", err);
    } finally {
      setSaving(false);
    }
  };

  const title = date ? `Editar Dia - ${formatDateDisplay(date)}` : "Editar Dia";

  return (
    <SlidePanel isOpen={date !== null} onClose={onClose} title={title}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Traffic Form */}
          <TrafficForm
            data={traffic}
            onChange={setTraffic}
            readOnly={!canEditTraffic}
          />

          {/* Commercial Table */}
          <CommercialTable
            vendors={commercials}
            onChange={setCommercials}
            readOnly={!canEditCommercial}
          />

          {/* Footer buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#232a3b]">
            <button
              type="button"
              onClick={handleCopyPrevious}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-[#1a1f2e] border border-[#232a3b] rounded-lg hover:bg-[#232a3b] transition disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              Copiar do dia anterior
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-teal-400 rounded-lg hover:bg-teal-500 transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        </div>
      )}
    </SlidePanel>
  );
}

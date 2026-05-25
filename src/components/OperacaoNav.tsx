"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Wrench, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Tab bar compartilhada do modulo "Setor Tecnico" — agrupa Pos-Venda (Yuri),
// Engenharia (Pedro) e o relatorio de Margem de Instalacao numa unica
// navegacao visual. Tab ativa baseada em pathname.
//
// Yuri e Pedro tem acesso a todas; cada um trabalha primariamente na sua
// (Yuri: pos-venda; Pedro: engenharia + margem). Funil de instalacao fica
// dentro da aba Engenharia.

interface OperacaoNavProps {
  contexto?: "operador" | "admin"; // operador = /pos-venda; admin = /admin/pos-venda
}

export function OperacaoNav({ contexto = "operador" }: OperacaoNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      href: contexto === "admin" ? "/admin/pos-venda" : "/pos-venda",
      label: "Pos-Venda",
      hint: "Yuri",
      icon: ClipboardCheck,
      activeColor: "bg-orange-400 text-gray-900",
      idleColor: "text-orange-400 hover:bg-orange-400/10",
      isActive: pathname === "/pos-venda" || pathname === "/admin/pos-venda",
    },
    {
      href: "/tecnico",
      label: "Engenharia",
      hint: "Pedro · Projetos + Instalacoes",
      icon: Wrench,
      activeColor: "bg-teal-400 text-gray-900",
      idleColor: "text-teal-400 hover:bg-teal-400/10",
      isActive: pathname === "/tecnico",
    },
    {
      href: "/tecnico/margem",
      label: "Margem Instalacao",
      hint: "Pedro · Custo real",
      icon: Activity,
      activeColor: "bg-teal-400 text-gray-900",
      idleColor: "text-teal-400 hover:bg-teal-400/10",
      isActive: pathname === "/tecnico/margem",
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Setor Tecnico</p>
      </div>
      <div className="flex flex-wrap gap-2 bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
              tab.isActive ? tab.activeColor : tab.idleColor
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="flex flex-col leading-tight">
              <span>{tab.label}</span>
              <span className={cn("text-[10px] font-normal opacity-80")}>{tab.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

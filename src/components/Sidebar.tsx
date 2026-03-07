"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Sun,
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Settings,
  Users,
  Layers,
  LogOut,
  Menu,
  X,
  BarChart3,
  Trophy,
  Calculator,
  Activity,
  ClipboardList,
  FileText,
  AlertTriangle,
  CreditCard,
  Target,
  TrendingUp,
  ClipboardCheck,
  ShieldCheck,
  Trash2,
  Banknote,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { isAdmin as checkAdmin, isDiretor as checkDiretor, isSDR as checkSDR, isPosVenda as checkPosVenda, isFinanceiro as checkFinanceiro, isTecnico as checkTecnico, canAccessTecnico as checkCanAccessTecnico } from "@/lib/roles";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = session?.user?.role;
  const admin = checkAdmin(userRole);
  const diretor = checkDiretor(userRole);
  const sdr = checkSDR(userRole);
  const posVenda = checkPosVenda(userRole);
  const financeiro = checkFinanceiro(userRole);
  const tecnico = checkTecnico(userRole);
  const canTecnico = checkCanAccessTecnico(userRole);

  const menuVendedor = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendas", label: "Minhas Vendas", icon: ShoppingCart },
    { href: "/vendedor/oportunidades", label: "Oportunidades", icon: Target },
    { href: "/calculadora", label: "Calculadora", icon: Calculator },
    { href: "/comissoes", label: "Comissoes", icon: DollarSign },
  ];

  const menuPerformance = [
    { href: "/performance", label: "Performance", icon: Activity },
  ];

  const menuSDR = [
    { href: "/sdr", label: "Dashboard SDR", icon: LayoutDashboard },
    { href: "/sdr/registros", label: "Meus Registros", icon: ClipboardList },
    { href: "/sdr/extrato", label: "Extrato", icon: FileText },
  ];

  const menuAdminSDR = [
    { href: "/admin/sdr", label: "Visao Geral SDR", icon: ClipboardList },
    { href: "/admin/sdr/pendencias", label: "Pendencias", icon: AlertTriangle },
    { href: "/admin/sdr/pagamento", label: "Pagamento SDR", icon: CreditCard },
    { href: "/admin/sdr/forecast", label: "Forecast", icon: TrendingUp },
  ];

  const menuAdmin = [
    { href: "/admin", label: "Painel Supervisor", icon: Settings },
    { href: "/admin/vendedores", label: "Vendedores", icon: Users },
    { href: "/admin/faixas", label: "Faixas", icon: Layers },
    { href: "/admin/configuracoes", label: "Configuracoes", icon: Settings },
  ];

  const menuFinanceiro = [
    { href: "/financeiro", label: "Painel Financeiro", icon: Banknote },
  ];

  const menuDiretor = [
    { href: "/diretor", label: "Painel Financeiro", icon: BarChart3 },
    { href: "/diretor/ranking", label: "Ranking Vendedores", icon: Trophy },
    { href: "/diretor/custos", label: "Custos por Venda", icon: Calculator },
    { href: "/diretor/backup", label: "Backup de Dados", icon: ShieldCheck },
  ];

  const getRoleBadge = () => {
    if (diretor) return { bg: "bg-amber-400/10 text-amber-400", label: "Diretor" };
    if (admin) return { bg: "bg-purple-400/10 text-purple-400", label: "Supervisor" };
    if (sdr) return { bg: "bg-sky-400/10 text-sky-400", label: "SDR" };
    if (posVenda) return { bg: "bg-orange-400/10 text-orange-400", label: "Pós Venda" };
    if (tecnico) return { bg: "bg-teal-400/10 text-teal-400", label: "Técnico" };
    if (financeiro) return { bg: "bg-emerald-400/10 text-emerald-400", label: "Financeiro" };
    return { bg: "bg-lime-400/10 text-lime-400", label: "Vendedor" };
  };

  const badge = getRoleBadge();

  const renderMenuSection = (
    items: { href: string; label: string; icon: any }[],
    activeColor: string,
    activeBg: string
  ) => (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
            pathname === item.href
              ? `${activeBg} ${activeColor}`
              : "text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-100"
          )}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#141820] border border-[#232a3b] rounded-lg shadow-md p-2 text-gray-300"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-[#141820] border-r border-[#232a3b] z-40 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#232a3b]">
          <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center">
            <Sun className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h1 className="font-bold text-gray-100">LIV Energia</h1>
            <p className="text-xs text-gray-400">Energia Solar</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-[#232a3b]">
          <p className="font-medium text-sm text-gray-100">{session?.user?.name}</p>
          <p className="text-xs text-gray-400">{session?.user?.email}</p>
          <span className={cn(
            "inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium",
            badge.bg
          )}>
            {badge.label}
          </span>
        </div>

        {/* Menu */}
        <nav className="px-3 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {/* Menu Vendedor — SDR, POS_VENDA, FINANCEIRO e TECNICO NAO veem */}
          {!sdr && !posVenda && !financeiro && !tecnico && (
            <>
              {admin && (
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Vendedor
                </p>
              )}
              {renderMenuSection(
                admin
                  ? menuVendedor.filter(item => item.href !== "/comissoes")
                  : menuVendedor,
                "text-lime-400",
                "bg-lime-400/10"
              )}
            </>
          )}

          {/* Menu Pos Venda — operador POS_VENDA ve seus clientes */}
          {posVenda && (
            <>
              <p className="px-3 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                Pós Venda
              </p>
              {renderMenuSection(
                [{ href: "/pos-venda", label: "Meus Clientes", icon: ClipboardCheck }],
                "text-orange-400",
                "bg-orange-400/10"
              )}
            </>
          )}

          {/* Menu Pos Venda Admin — Admin/Diretor ve visao geral */}
          {admin && (
            <>
              <div className="my-3 border-t border-[#232a3b]" />
              <p className="px-3 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                Pós Venda
              </p>
              {renderMenuSection(
                [{ href: "/admin/pos-venda", label: "Visao Pos Venda", icon: ClipboardCheck }],
                "text-orange-400",
                "bg-orange-400/10"
              )}
            </>
          )}

          {/* Menu Setor Tecnico — TECNICO, POS_VENDA, ADMIN, DIRETOR */}
          {canTecnico && (
            <>
              {!tecnico && <div className="my-3 border-t border-[#232a3b]" />}
              <p className="px-3 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                Setor Técnico
              </p>
              {renderMenuSection(
                [{ href: "/tecnico", label: "Setor Técnico", icon: Wrench }],
                "text-teal-400",
                "bg-teal-400/10"
              )}
            </>
          )}

          {/* Menu SDR — SDR ve seus menus, Admin/Diretor ve admin SDR */}
          {(sdr || admin) && (
            <>
              {!sdr && <div className="my-3 border-t border-[#232a3b]" />}
              <p className="px-3 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
                SDR
              </p>
              {sdr && renderMenuSection(menuSDR, "text-sky-400", "bg-sky-400/10")}
              {admin && renderMenuSection(menuAdminSDR, "text-sky-400", "bg-sky-400/10")}
            </>
          )}

          {/* Menu Financeiro */}
          {(financeiro || admin) && (
            <>
              {!financeiro && <div className="my-3 border-t border-[#232a3b]" />}
              <p className="px-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                Financeiro
              </p>
              {renderMenuSection(menuFinanceiro, "text-emerald-400", "bg-emerald-400/10")}
            </>
          )}

          {/* Menu Performance */}
          {admin && (
            <>
              <div className="my-3 border-t border-[#232a3b]" />
              <p className="px-3 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                Performance
              </p>
              {renderMenuSection(menuPerformance, "text-teal-400", "bg-teal-400/10")}
            </>
          )}

          {/* Menu Diretor */}
          {diretor && (
            <>
              <div className="my-3 border-t border-[#232a3b]" />
              <p className="px-3 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                Diretor
              </p>
              {renderMenuSection(menuDiretor, "text-amber-400", "bg-amber-400/10")}
            </>
          )}

          {/* Menu Admin */}
          {admin && (
            <>
              <div className="my-3 border-t border-[#232a3b]" />
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Supervisor
              </p>
              {renderMenuSection(menuAdmin, "text-purple-400", "bg-purple-400/10")}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#232a3b]">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

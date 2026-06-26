"use client";
import { AppShell } from "@/components/AppShell";
import { canAccessFinanceiro } from "@/lib/roles";
export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => canAccessFinanceiro(r)}>{children}</AppShell>;
}

"use client";
import { AppShell } from "@/components/AppShell";
import { canAccessOperacao } from "@/lib/roles";
export default function PosVendaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => canAccessOperacao(r)}>{children}</AppShell>;
}

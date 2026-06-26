"use client";
import { AppShell } from "@/components/AppShell";
import { canViewSupervisorCommission } from "@/lib/roles";
export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => canViewSupervisorCommission(r)}>{children}</AppShell>;
}

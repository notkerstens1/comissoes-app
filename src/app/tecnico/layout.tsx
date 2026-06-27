"use client";
import { AppShell } from "@/components/AppShell";
import { canAccessTecnico } from "@/lib/roles";
export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => canAccessTecnico(r)}>{children}</AppShell>;
}

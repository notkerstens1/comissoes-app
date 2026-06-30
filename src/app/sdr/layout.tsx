"use client";
import { AppShell } from "@/components/AppShell";
import { isSDR, canManageSdrRegistros } from "@/lib/roles";
export default function SDRLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => isSDR(r) || canManageSdrRegistros(r)}>{children}</AppShell>;
}

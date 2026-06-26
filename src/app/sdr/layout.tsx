"use client";
import { AppShell } from "@/components/AppShell";
import { isSDR, isAdmin } from "@/lib/roles";
export default function SDRLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => isSDR(r) || isAdmin(r)}>{children}</AppShell>;
}

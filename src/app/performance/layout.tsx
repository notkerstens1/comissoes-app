"use client";
import { AppShell } from "@/components/AppShell";
import { isAdmin } from "@/lib/roles";
export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => isAdmin(r)}>{children}</AppShell>;
}

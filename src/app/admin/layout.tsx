"use client";
import { AppShell } from "@/components/AppShell";
import { isAdmin } from "@/lib/roles";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => isAdmin(r)}>{children}</AppShell>;
}

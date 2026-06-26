"use client";
import { AppShell } from "@/components/AppShell";
import { isDiretor } from "@/lib/roles";
export default function DiretorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => isDiretor(r)}>{children}</AppShell>;
}

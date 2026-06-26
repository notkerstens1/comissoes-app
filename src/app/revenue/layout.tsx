"use client";
import { AppShell } from "@/components/AppShell";
export default function RevenueLayout({ children }: { children: React.ReactNode }) {
  return <AppShell guard={(r) => r !== "FINANCEIRO"} deniedRedirect="/financeiro">{children}</AppShell>;
}

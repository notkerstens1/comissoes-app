"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { canAccessFinanceiro } from "@/lib/roles";

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated" && !canAccessFinanceiro(session?.user?.role)) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!session || !canAccessFinanceiro(session.user.role)) return null;

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">{children}</main>
    </div>
  );
}

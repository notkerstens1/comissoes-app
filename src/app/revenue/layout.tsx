"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { isAdmin } from "@/lib/roles";

export default function RevenueLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    // Vendedores e SDRs podem ver com visao limitada, mas POS_VENDA e FINANCEIRO nao
    if (status === "authenticated") {
      const role = session?.user?.role;
      if (role === "FINANCEIRO") router.push("/financeiro");
    }
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8">{children}</main>
    </div>
  );
}

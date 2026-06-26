"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessOperacao } from "@/lib/roles";

export default function PosVendaLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    if (!canAccessOperacao(session.user.role)) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-liv-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-liv-line border-t-liv-sage" />
      </div>
    );
  }

  // A própria página de Pós-Venda renderiza o Sidebar; este layout é só o guard.
  return <>{children}</>;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveRanking } from "@/components/dashboard/LiveRanking";
import { getCurrentMonthRange } from "@/lib/dates";

export default function TelaoPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const range = getCurrentMonthRange();

  React.useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-liv-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-liv-line border-t-liv-sage" />
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-liv-bg p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.16em] text-liv-faint">LIV Energia · Comissões</span>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
        <LiveRanking inicio={range.start} fim={range.end} telao />
      </div>
    </div>
  );
}

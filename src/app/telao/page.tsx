"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveRanking } from "@/components/dashboard/LiveRanking";
import { getCurrentMonthRange } from "@/lib/dates";

export default function TelaoPage() {
  const router = useRouter();
  const range = getCurrentMonthRange();

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

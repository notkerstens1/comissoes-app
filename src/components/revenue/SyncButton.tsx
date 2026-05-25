"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncButton({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync/meta-ads", { method: "POST" });
      const data = await res.json();
      setResult(res.ok ? "Meta Ads sincronizado" : data.error || "Erro no sync");
      onSyncComplete?.();
    } catch {
      setResult("Erro no sync");
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#232a3b] text-gray-300 hover:text-lime-400 hover:border-lime-400/30 transition-all text-sm disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Sincronizando..." : "Sync Meta"}
      </button>
      {result && (
        <div className="absolute top-full right-0 mt-1 px-3 py-1.5 rounded-lg bg-lime-400/10 text-lime-400 text-xs whitespace-nowrap">
          {result}
        </div>
      )}
    </div>
  );
}

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
      const call = (url: string) =>
        fetch(url, { method: "POST" }).then(async (r) => ({ ok: r.ok, data: await r.json() }));
      const [meta, cc] = await Promise.all([
        call("/api/sync/meta-ads"),
        call("/api/sync/chatclean"),
      ]);
      const parts = [
        meta.ok ? "Meta ✓" : `Meta: ${meta.data.error || "erro"}`,
        cc.ok ? `ChatClean ✓ (${cc.data.synced ?? 0} leads)` : `ChatClean: ${cc.data.error || "erro"}`,
      ];
      setResult(parts.join(" · "));
      onSyncComplete?.();
    } catch {
      setResult("Erro no sync");
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 7000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-liv-surface border border-liv-line text-liv-muted hover:text-liv-sage hover:border-liv-sage/30 transition-all text-sm disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Sincronizando..." : "Sincronizar"}
      </button>
      {result && (
        <div className="absolute top-full right-0 mt-1 px-3 py-1.5 rounded-lg bg-liv-sage/10 text-liv-sage text-xs whitespace-nowrap">
          {result}
        </div>
      )}
    </div>
  );
}

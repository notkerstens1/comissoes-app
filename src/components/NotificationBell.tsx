"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";

interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  vendaId: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotificacoes = async () => {
    try {
      const res = await fetch("/api/notificacoes");
      if (res.ok) {
        const data = await res.json();
        setNotificacoes(data);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchNotificacoes();
    // Poll every 30s for new notifications
    const interval = setInterval(fetchNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const marcarComoLida = async (id: string) => {
    try {
      await fetch("/api/notificacoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // silently fail
    }
  };

  const marcarTodas = async () => {
    try {
      await fetch("/api/notificacoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcarTodas: true }),
      });
      setNotificacoes([]);
    } catch {
      // silently fail
    }
  };

  const count = notificacoes.length;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-[#232a3b] transition"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1f2e] rounded-xl border border-[#232a3b] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#232a3b] flex items-center justify-between">
            <h3 className="font-semibold text-gray-100 text-sm">Notificacoes</h3>
            {count > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs text-gray-400 hover:text-gray-100 flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                Nenhuma notificacao pendente
              </div>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-[#232a3b] last:border-b-0 hover:bg-[#232a3b]/50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-100 leading-snug">{n.mensagem}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => marcarComoLida(n.id)}
                      className="p-1 rounded text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition flex-shrink-0"
                      title="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

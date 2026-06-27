"use client";

import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";

/**
 * Carrega sob demanda o documento (conta de luz / imagem) anexado a um
 * RegistroSDR. A listagem NÃO trafega o base64 (payload pesado) — só um flag
 * `temImagem`. Este componente busca a imagem real via GET /api/sdr/registros/[id]
 * apenas quando o detalhe/card é aberto.
 */
export function DocumentoAnexado({ registroId }: { registroId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErro(false);
    fetch(`/api/sdr/registros/${registroId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (alive) setUrl(d?.imagemUrl ?? null);
      })
      .catch(() => {
        if (alive) setErro(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [registroId]);

  if (loading) {
    return <div className="h-32 w-full max-w-xs animate-pulse rounded-lg bg-liv-surface-2" />;
  }

  if (erro || !url) {
    return <p className="text-xs text-liv-faint">Não foi possível carregar o documento.</p>;
  }

  return url.startsWith("data:image") ? (
    <img
      src={url}
      alt="Documento anexado"
      className="max-h-64 max-w-full cursor-pointer rounded-lg border border-liv-line object-contain transition hover:opacity-80"
      onClick={() => window.open(url, "_blank")}
    />
  ) : (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1 text-sm text-liv-sage hover:underline"
    >
      <Paperclip className="h-3.5 w-3.5" /> Ver documento
    </a>
  );
}

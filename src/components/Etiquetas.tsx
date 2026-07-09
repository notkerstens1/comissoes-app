import { ETIQUETAS, ETIQUETA_CORES, getEtiqueta } from "@/lib/etiquetas";

// Chips somente-leitura, exibidos no cabecalho do card (sempre visiveis).
export function EtiquetasChips({ etiquetas }: { etiquetas: string[] }) {
  if (!etiquetas.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {etiquetas.map((key) => {
        const et = getEtiqueta(key);
        if (!et) return null;
        const c = ETIQUETA_CORES[key];
        return (
          <span
            key={key}
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}
          >
            {et.label}
          </span>
        );
      })}
    </div>
  );
}

// Seletor multi-toggle, exibido na area expandida do card.
export function EtiquetasSelector({
  etiquetas,
  onToggle,
  disabled,
}: {
  etiquetas: string[];
  onToggle: (key: string, action: "add" | "remove") => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ETIQUETAS.map((et) => {
        const ativo = etiquetas.includes(et.key);
        const c = ETIQUETA_CORES[et.key];
        return (
          <button
            key={et.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(et.key, ativo ? "remove" : "add")}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition disabled:opacity-50 ${
              ativo
                ? `${c.bg} ${c.text} ${c.border}`
                : "bg-transparent text-liv-faint border-liv-line hover:text-liv-ink hover:border-liv-sage/40"
            }`}
          >
            {ativo ? "✓ " : ""}
            {et.label}
          </button>
        );
      })}
    </div>
  );
}

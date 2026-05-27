import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function parseCurrencyInput(value: string): number {
  // Remove tudo que nao e digito ou virgula
  // Formato brasileiro: 12.890,50 → 12890.50
  let cleaned = value.replace(/[^\d,]/g, "");
  // Substitui virgula por ponto (decimal brasileiro → decimal JS)
  cleaned = cleaned.replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/**
 * Formata um valor numerico para exibicao no input em formato brasileiro
 * Ex: 12890.5 → "12.890,50"
 */
export function formatCurrencyInput(value: number): string {
  if (value === 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Mascara de input monetario brasileiro.
 * Aceita digitos, ponto e virgula. Resolve o teclado mobile que so expoe "."
 * (iOS/Android inputMode=decimal) sem quebrar o auto-format de milhar.
 *
 * Regras pra escolher o decimal:
 * - Se ha qualquer ",": eh sempre decimal (BR convention).
 * - Caso contrario, considera o ultimo "." apenas se houver <= 2 digitos
 *   depois dele. Mais que 2 digitos significa que o "." veio do auto-format
 *   de milhar (ex: "1.2345" depois de "1.234" + tecla "5") — strip todos.
 */
export function handleCurrencyKeyInput(rawValue: string): { display: string; numericValue: number } {
  const cleaned = rawValue.replace(/[^\d.,]/g, "");
  if (cleaned === "") return { display: "", numericValue: 0 };

  let decimalPos = -1;
  const lastComma = cleaned.lastIndexOf(",");
  if (lastComma !== -1) {
    decimalPos = lastComma;
  } else {
    const lastDot = cleaned.lastIndexOf(".");
    if (lastDot !== -1 && cleaned.length - lastDot - 1 <= 2) {
      decimalPos = lastDot;
    }
  }

  let intRaw: string;
  let decRaw: string;
  if (decimalPos === -1) {
    intRaw = cleaned.replace(/[.,]/g, "");
    decRaw = "";
  } else {
    intRaw = cleaned.substring(0, decimalPos).replace(/[.,]/g, "");
    decRaw = cleaned.substring(decimalPos + 1).replace(/[.,]/g, "");
  }

  if (decRaw.length > 2) decRaw = decRaw.substring(0, 2);

  intRaw = intRaw.replace(/^0+(\d)/, "$1");
  if (intRaw === "") intRaw = decimalPos !== -1 ? "0" : "";

  const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const display = decimalPos !== -1 ? `${intFormatted},${decRaw}` : intFormatted;
  const numericValue = parseFloat(`${intRaw || "0"}.${decRaw || "0"}`) || 0;

  return { display, numericValue };
}

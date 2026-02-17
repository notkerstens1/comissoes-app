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
 * Mascara de input monetario brasileiro
 * Aceita apenas digitos e virgula, formata automaticamente
 * Retorna o valor formatado como string e o valor numerico
 */
export function handleCurrencyKeyInput(rawValue: string): { display: string; numericValue: number } {
  // Remove tudo que nao e digito ou virgula
  let cleaned = rawValue.replace(/[^\d,]/g, "");

  // Permite no maximo uma virgula
  const parts = cleaned.split(",");
  if (parts.length > 2) {
    cleaned = parts[0] + "," + parts.slice(1).join("");
  }

  // Limita casas decimais a 2
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + "," + parts[1].substring(0, 2);
  }

  // Adiciona pontos como separador de milhares na parte inteira
  const partsFormatted = cleaned.split(",");
  let intPart = partsFormatted[0];

  // Remove zeros a esquerda (exceto se for so "0")
  intPart = intPart.replace(/^0+(\d)/, "$1");

  // Adiciona separador de milhar
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const display = partsFormatted.length === 2 ? intPart + "," + partsFormatted[1] : intPart;

  // Calcula valor numerico
  const numericValue = parseCurrencyInput(cleaned);

  return { display, numericValue };
}

// Normaliza para digitos com DDI 55. Retorna "" se vazio.
export function normalizePhone(raw: string | null | undefined): string {
  const d = (raw || "").toString().replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? d : "55" + d;
}

// Valida que tem 55 + DDD(2) + 8 ou 9 digitos => 12 ou 13 digitos
export function isValidPhone(normalized: string): boolean {
  return /^55\d{10,11}$/.test(normalized);
}

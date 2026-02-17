// ============================================================
// CONTROLE DE ROLES/PAPEIS DO SISTEMA
// ============================================================

export type UserRole = "VENDEDOR" | "ADMIN" | "DIRETOR" | "SDR";

/**
 * Verifica se o usuario tem permissoes de supervisor (ADMIN ou DIRETOR)
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "DIRETOR";
}

/**
 * Verifica se o usuario e somente supervisor (ADMIN), sem acesso de diretor
 */
export function isSupervisor(role: string | undefined | null): boolean {
  return role === "ADMIN";
}

/**
 * Verifica se o usuario e diretor
 */
export function isDiretor(role: string | undefined | null): boolean {
  return role === "DIRETOR";
}

/**
 * Verifica se o usuario e vendedor
 */
export function isVendedor(role: string | undefined | null): boolean {
  return role === "VENDEDOR";
}

/**
 * Verifica se o usuario e SDR
 */
export function isSDR(role: string | undefined | null): boolean {
  return role === "SDR";
}

/**
 * Retorna o label legivel do role
 */
export function getRoleLabel(role: string | undefined | null): string {
  switch (role) {
    case "DIRETOR":
      return "Diretor";
    case "ADMIN":
      return "Supervisor";
    case "VENDEDOR":
      return "Vendedor";
    case "SDR":
      return "SDR";
    default:
      return "Desconhecido";
  }
}

/**
 * Retorna a rota padrao apos login baseado no role
 */
export function getDefaultRoute(role: string | undefined | null): string {
  switch (role) {
    case "DIRETOR":
      return "/diretor";
    case "ADMIN":
      return "/admin";
    case "SDR":
      return "/sdr";
    default:
      return "/dashboard";
  }
}

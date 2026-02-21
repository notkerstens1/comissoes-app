// ============================================================
// CONTROLE DE ROLES/PAPEIS DO SISTEMA
// ============================================================

export type UserRole = "VENDEDOR" | "VENDEDOR_EXTERNO" | "ADMIN" | "DIRETOR" | "SDR" | "POS_VENDA";

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
 * Verifica se o usuario e vendedor (interno ou externo)
 */
export function isVendedor(role: string | undefined | null): boolean {
  return role === "VENDEDOR" || role === "VENDEDOR_EXTERNO";
}

/**
 * Verifica se o usuario e vendedor externo
 */
export function isVendedorExterno(role: string | undefined | null): boolean {
  return role === "VENDEDOR_EXTERNO";
}

/**
 * Verifica se o usuario e SDR
 */
export function isSDR(role: string | undefined | null): boolean {
  return role === "SDR";
}

/**
 * Verifica se o usuario e operador de Pos Venda
 */
export function isPosVenda(role: string | undefined | null): boolean {
  return role === "POS_VENDA";
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
    case "VENDEDOR_EXTERNO":
      return "Vendedor Externo";
    case "SDR":
      return "SDR";
    case "POS_VENDA":
      return "Pós Venda";
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
    case "VENDEDOR":
    case "VENDEDOR_EXTERNO":
      return "/vendedor/oportunidades";
    case "SDR":
      return "/sdr";
    case "POS_VENDA":
      return "/pos-venda";
    default:
      return "/dashboard";
  }
}

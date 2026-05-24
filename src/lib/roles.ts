// ============================================================
// CONTROLE DE ROLES/PAPEIS DO SISTEMA
// ============================================================

export type UserRole = "VENDEDOR" | "VENDEDOR_EXTERNO" | "VENDEDOR_HIBRIDO" | "ADMIN" | "DIRETOR" | "SUPERVISOR" | "SDR" | "POS_VENDA" | "FINANCEIRO" | "TECNICO";

/**
 * Conjunto canonico de roles que compoem o "time de vendas" (aparece em
 * dropdowns de filtro por vendedor, ranking, performance, etc).
 *
 * NAO inclui ADMIN/DIRETOR/SUPERVISOR — esses sao papeis administrativos que
 * podem ate visualizar dados de vendedores, mas nao SAO vendedores nem devem
 * aparecer em listagens de selecao.
 */
export const ROLES_VENDEDOR_TIME = ["VENDEDOR", "VENDEDOR_EXTERNO", "VENDEDOR_HIBRIDO"] as const;

/**
 * Verifica se o usuario tem permissoes administrativas plenas (ADMIN ou DIRETOR).
 * NAO inclui SUPERVISOR de operacao — supervisor de operacao tem acesso restrito.
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "DIRETOR";
}

/**
 * Verifica se o usuario e supervisor (de operacao OU papel admin).
 * SUPERVISOR ve comissao propria; ADMIN/DIRETOR tambem podem ver (compat).
 */
export function isSupervisor(role: string | undefined | null): boolean {
  return role === "SUPERVISOR" || role === "ADMIN" || role === "DIRETOR";
}

/**
 * Verifica se o usuario pode visualizar a comissao do supervisor.
 * A comissao e do CARGO supervisor (% sobre receita da empresa), nao por pessoa.
 * Acesso: SUPERVISOR (cargo), ADMIN (papel atual do Eric Lima) e DIRETOR.
 * Vendedores, SDR, Pos-Venda, Tecnico e Financeiro NAO veem.
 */
export function canViewSupervisorCommission(role: string | undefined | null): boolean {
  return role === "SUPERVISOR" || role === "ADMIN" || role === "DIRETOR";
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
  return role === "VENDEDOR" || role === "VENDEDOR_EXTERNO" || role === "VENDEDOR_HIBRIDO";
}

/**
 * Verifica se o usuario e vendedor externo
 */
export function isVendedorExterno(role: string | undefined | null): boolean {
  return role === "VENDEDOR_EXTERNO";
}

/**
 * Verifica se o usuario e vendedor hibrido (interno + externo)
 * Vendedor hibrido escolhe origem (INBOUND ou EXTERNA) em cada venda
 */
export function isVendedorHibrido(role: string | undefined | null): boolean {
  return role === "VENDEDOR_HIBRIDO";
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
 * Verifica se o usuario e financeiro
 */
export function isFinanceiro(role: string | undefined | null): boolean {
  return role === "FINANCEIRO";
}

/**
 * Verifica se o usuario e tecnico (engenheiro)
 */
export function isTecnico(role: string | undefined | null): boolean {
  return role === "TECNICO";
}

/**
 * Verifica se o usuario pode acessar o setor tecnico (TECNICO, POS_VENDA, ADMIN ou DIRETOR)
 */
export function canAccessTecnico(role: string | undefined | null): boolean {
  return role === "TECNICO" || role === "POS_VENDA" || role === "ADMIN" || role === "DIRETOR";
}

/**
 * Verifica se o usuario pode acessar a pagina Time (gerenciar usuarios)
 * ADMIN, DIRETOR e POS_VENDA podem acessar
 */
export function canManageTeam(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "DIRETOR" || role === "POS_VENDA";
}

/**
 * Verifica se o usuario pode editar vendas (ADMIN, DIRETOR ou FINANCEIRO)
 */
export function canEditVenda(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "DIRETOR" || role === "FINANCEIRO";
}

/**
 * Verifica se o usuario pode acessar area financeira (FINANCEIRO, ADMIN ou DIRETOR)
 */
export function canAccessFinanceiro(role: string | undefined | null): boolean {
  return role === "FINANCEIRO" || role === "ADMIN" || role === "DIRETOR";
}

/**
 * Retorna o label legivel do role
 */
export function getRoleLabel(role: string | undefined | null): string {
  switch (role) {
    case "DIRETOR":
      return "Diretor";
    case "ADMIN":
      return "Admin";
    case "SUPERVISOR":
      return "Supervisor";
    case "VENDEDOR":
      return "Vendedor";
    case "VENDEDOR_EXTERNO":
      return "Vendedor Externo";
    case "VENDEDOR_HIBRIDO":
      return "Vendedor Híbrido";
    case "SDR":
      return "SDR";
    case "POS_VENDA":
      return "Pós Venda";
    case "FINANCEIRO":
      return "Financeiro";
    case "TECNICO":
      return "Técnico";
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
    case "SUPERVISOR":
      return "/supervisor";
    case "VENDEDOR":
    case "VENDEDOR_EXTERNO":
      return "/vendedor/oportunidades";
    case "SDR":
      return "/sdr";
    case "POS_VENDA":
      return "/pos-venda";
    case "TECNICO":
      return "/tecnico";
    case "FINANCEIRO":
      return "/financeiro";
    default:
      return "/dashboard";
  }
}

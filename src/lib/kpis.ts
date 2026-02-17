// KPIs de Performance - Funcao pura (usada no server e client)
// Retorna null quando divisor = 0 (exibir "—" no frontend)

export interface KPIResult {
  cpm: number | null;       // Custo por Mil (investment / pessoasAlcancadas * 1000)
  cpl: number | null;       // Custo por Lead (investment / totalLeads)
  custoMql: number | null;  // Custo por MQL (investment / totalMql)
  custoSql: number | null;  // Custo por SQL/Reuniao (investment / totalReunioes)
  cac: number | null;       // Custo de Aquisicao (investment / totalFechados)
}

export function calculateKPIs(
  investment: number,
  pessoasAlcancadas: number,
  totalLeads: number,
  totalMql: number,
  totalReunioes: number,
  totalFechados: number
): KPIResult {
  return {
    cpm: pessoasAlcancadas > 0 ? (investment / pessoasAlcancadas) * 1000 : null,
    cpl: totalLeads > 0 ? investment / totalLeads : null,
    custoMql: totalMql > 0 ? investment / totalMql : null,
    custoSql: totalReunioes > 0 ? investment / totalReunioes : null,
    cac: totalFechados > 0 ? investment / totalFechados : null,
  };
}

// Calcula investimento com base no toggle
export function getInvestment(
  valorInvestidoVendas: number,
  valorInvestidoBranding: number,
  type: "vendas" | "total"
): number {
  if (type === "total") {
    return valorInvestidoVendas + valorInvestidoBranding;
  }
  return valorInvestidoVendas;
}

// Formata KPI para exibicao (null -> "—")
export function formatKPI(value: number | null, prefix: string = "R$ "): string {
  if (value === null) return "—";
  return `${prefix}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

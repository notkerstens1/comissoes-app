// Nibo Financial API Client
// REST API com API-Key auth + OData filtering

const BASE_URL = "https://api.nibo.com.br";

interface NiboReceivable {
  id: string;
  description: string;
  categoryName?: string;
  value: number;
  dueDate: string;
  paymentDate?: string;
  isOverdue: boolean;
  isPaid: boolean;
  stakeholderName?: string;
}

interface NiboPayable {
  id: string;
  description: string;
  categoryName?: string;
  value: number;
  dueDate: string;
  paymentDate?: string;
  isOverdue: boolean;
  isPaid: boolean;
  stakeholderName?: string;
}

export interface NiboRecordData {
  niboId: string;
  tipo: "receber" | "pagar";
  descricao: string;
  categoria: string | null;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: "aberto" | "pago" | "vencido";
  contato: string | null;
}

async function niboFetch(path: string, apiKey: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      ApiToken: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "");
    throw new Error(`Nibo API erro ${res.status}: ${error}`);
  }

  return res.json();
}

// Buscar contas a receber
export async function fetchReceivables(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<NiboRecordData[]> {
  const data = await niboFetch("/v2/schedules/receivable", apiKey, {
    $filter: `dueDate ge '${startDate}' and dueDate le '${endDate}'`,
    $top: "500",
  });

  const items = data.items || data.value || data || [];
  return items.map((item: any) => ({
    niboId: String(item.id || item.scheduleId),
    tipo: "receber" as const,
    descricao: item.description || item.categoryName || "Sem descricao",
    categoria: item.categoryName || null,
    valor: Math.abs(item.value || item.amount || 0),
    dataVencimento: (item.dueDate || "").split("T")[0],
    dataPagamento: item.paymentDate ? item.paymentDate.split("T")[0] : null,
    status: item.isPaid ? "pago" : item.isOverdue ? "vencido" : "aberto",
    contato: item.stakeholderName || null,
  }));
}

// Buscar contas a pagar
export async function fetchPayables(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<NiboRecordData[]> {
  const data = await niboFetch("/v2/schedules/payable", apiKey, {
    $filter: `dueDate ge '${startDate}' and dueDate le '${endDate}'`,
    $top: "500",
  });

  const items = data.items || data.value || data || [];
  return items.map((item: any) => ({
    niboId: String(item.id || item.scheduleId),
    tipo: "pagar" as const,
    descricao: item.description || item.categoryName || "Sem descricao",
    categoria: item.categoryName || null,
    valor: Math.abs(item.value || item.amount || 0),
    dataVencimento: (item.dueDate || "").split("T")[0],
    dataPagamento: item.paymentDate ? item.paymentDate.split("T")[0] : null,
    status: item.isPaid ? "pago" : item.isOverdue ? "vencido" : "aberto",
    contato: item.stakeholderName || null,
  }));
}

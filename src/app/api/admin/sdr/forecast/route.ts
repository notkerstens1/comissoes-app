import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET — forecast agregado para supervisor/diretor
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const registros = await prisma.registroSDR.findMany({
    where: {
      statusLead: { in: ["AGENDADO", "COMPARECEU"] },
    },
    include: {
      vendedora: { select: { id: true, nome: true } },
    },
  });

  // Totais gerais
  const totalOportunidades = registros.length;
  const totalForecast = registros.reduce((sum, r) => sum + (r.valorForecast ?? 0), 0);
  const totalPonderado = registros.reduce(
    (sum, r) => sum + (r.valorForecast ?? 0) * (r.probabilidade / 100),
    0
  );

  // Por estágio
  const estagios = ["REUNIAO", "PROPOSTA", "NEGOCIACAO", "FECHADA"];
  const porEstagio = estagios.reduce((acc, est) => {
    const filtrados = registros.filter((r) => r.estagioOportunidade === est);
    acc[est] = {
      count: filtrados.length,
      valorTotal: filtrados.reduce((s, r) => s + (r.valorForecast ?? 0), 0),
      valorPonderado: filtrados.reduce((s, r) => s + (r.valorForecast ?? 0) * (r.probabilidade / 100), 0),
    };
    return acc;
  }, {} as Record<string, { count: number; valorTotal: number; valorPonderado: number }>);

  // Por vendedor
  const vendedoresMap = new Map<string, { nome: string; qtd: number; valorTotal: number; valorPonderado: number; probMedia: number; soma: number }>();
  for (const r of registros) {
    const key = r.vendedoraId;
    const entry = vendedoresMap.get(key) ?? {
      nome: r.vendedora.nome,
      qtd: 0,
      valorTotal: 0,
      valorPonderado: 0,
      probMedia: 0,
      soma: 0,
    };
    entry.qtd += 1;
    entry.valorTotal += r.valorForecast ?? 0;
    entry.valorPonderado += (r.valorForecast ?? 0) * (r.probabilidade / 100);
    entry.soma += r.probabilidade;
    vendedoresMap.set(key, entry);
  }
  const porVendedor = Array.from(vendedoresMap.entries()).map(([id, v]) => ({
    id,
    nome: v.nome,
    qtd: v.qtd,
    valorTotal: v.valorTotal,
    valorPonderado: v.valorPonderado,
    probMedia: v.qtd > 0 ? Math.round(v.soma / v.qtd) : 0,
  })).sort((a, b) => b.valorTotal - a.valorTotal);

  return NextResponse.json({
    totalOportunidades,
    totalForecast,
    totalPonderado,
    porEstagio,
    porVendedor,
  });
}

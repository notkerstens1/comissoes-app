import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSupervisorCommission, ROLES_VENDEDOR_TIME } from "@/lib/roles";
import { calcularComissaoSupervisor } from "@/lib/comissao-supervisor";

// Retorna a comissao do supervisor para o mes solicitado (ou mes atual)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  if (!canViewSupervisorCommission(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mesParam = searchParams.get("mes"); // "YYYY-MM"
  const now = new Date();
  const mesReferencia = mesParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const config = await prisma.configuracao.findFirst();
  if (!config) {
    return NextResponse.json({ error: "Configuracao nao encontrada" }, { status: 500 });
  }

  // Soma receita do mes (todas vendas — inbound + externa, todos vendedores)
  const vendasDoMes = await prisma.venda.findMany({
    where: { mesReferencia },
    select: { valorVenda: true, vendedor: { select: { nome: true } }, tipoVenda: true },
  });
  const totalVendido = vendasDoMes.reduce((s, v) => s + v.valorVenda, 0);

  // Meta do supervisor é por QUANTIDADE de vendas do time:
  // metaVendasQtdMes (por vendedor) x nº de vendedores ativos.
  const numVendedoresAtivos = await prisma.user.count({
    where: { role: { in: [...ROLES_VENDEDOR_TIME] }, ativo: true },
  });
  const metaVendasQtdTime = (config.metaVendasQtdMes ?? 8) * numVendedoresAtivos;

  // Dias do mes (para projecao)
  const [anoStr, mesStr] = mesReferencia.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const diasTotal = new Date(ano, mes, 0).getDate();
  // Se mes corrente, dias decorridos = hoje; se mes passado, dias = diasTotal
  const ehMesCorrente = ano === now.getFullYear() && mes === now.getMonth() + 1;
  const diasDecorridos = ehMesCorrente ? now.getDate() : diasTotal;

  const resultado = calcularComissaoSupervisor(
    totalVendido,
    vendasDoMes.length,
    {
      metaReceitaMensal: config.metaReceitaMensal,
      metaVendasQtdTime,
      percentualSupervisorAte80: config.percentualSupervisorAte80,
      percentualSupervisor80a100: config.percentualSupervisor80a100,
      percentualSupervisorAcima100: config.percentualSupervisorAcima100,
    },
    mesReferencia,
    diasDecorridos,
    diasTotal
  );

  // Breakdown por vendedor (transparencia: de onde a receita esta vindo)
  const porVendedor = new Map<string, number>();
  vendasDoMes.forEach((v) => {
    const nome = v.vendedor?.nome ?? "Sem vendedor";
    porVendedor.set(nome, (porVendedor.get(nome) ?? 0) + v.valorVenda);
  });
  const breakdownVendedores = Array.from(porVendedor.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    ...resultado,
    quantidadeVendas: vendasDoMes.length,
    breakdownVendedores,
  });
}

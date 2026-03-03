import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessFinanceiro } from "@/lib/roles";

/**
 * GET /api/financeiro/vendas?mes=YYYY-MM
 * Lista vendas do mes com dados para pagamento de comissao.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessFinanceiro(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const mes = searchParams.get("mes") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const vendas = await prisma.venda.findMany({
    where: { mesReferencia: mes },
    include: {
      vendedor: { select: { id: true, nome: true } },
      registrosSDR: {
        select: {
          id: true,
          nomeCliente: true,
          sdr: { select: { nome: true } },
          dataReuniao: true,
          compareceu: true,
          motivoNaoCompareceu: true,
          consideracoes: true,
          imagemUrl: true,
          statusLead: true,
        },
      },
    },
    orderBy: { dataConversao: "desc" },
  });

  // Totais agregados
  const totalVendas = vendas.reduce((sum, v) => sum + v.valorVenda, 0);
  const totalEquipamentos = vendas.reduce((sum, v) => sum + v.custoEquipamentos, 0);
  const totalComissoes = vendas.reduce((sum, v) => sum + v.comissaoTotal, 0);
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;

  return NextResponse.json({
    vendas: vendas.map((v) => ({
      id: v.id,
      cliente: v.cliente,
      vendedor: v.vendedor.nome,
      vendedorId: v.vendedorId,
      valorVenda: v.valorVenda,
      custoEquipamentos: v.custoEquipamentos,
      formaPagamento: v.formaPagamento,
      distribuidora: v.distribuidora,
      comissaoVenda: v.comissaoVenda,
      comissaoOver: v.comissaoOver,
      comissaoTotal: v.comissaoTotal,
      dataConversao: v.dataConversao,
      status: v.status,
      orcamentoUrl: v.orcamentoUrl,
      kwp: v.kwp,
      quantidadePlacas: v.quantidadePlacas,
      quantidadeInversores: v.quantidadeInversores,
      registrosSDR: v.registrosSDR.map((sdr) => ({
        id: sdr.id,
        nomeCliente: sdr.nomeCliente,
        sdrNome: sdr.sdr.nome,
        dataReuniao: sdr.dataReuniao,
        compareceu: sdr.compareceu,
        motivoNaoCompareceu: sdr.motivoNaoCompareceu,
        consideracoes: sdr.consideracoes,
        imagemUrl: sdr.imagemUrl,
        statusLead: sdr.statusLead,
      })),
    })),
    totalVendas,
    totalEquipamentos,
    totalComissoes,
    ticketMedio,
    mes,
  });
}

/**
 * PUT /api/financeiro/vendas
 * Marcar venda como PAGO e notificar vendedor.
 * Body: { vendaId: string }
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessFinanceiro(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { vendaId } = body;

  if (!vendaId) {
    return NextResponse.json({ error: "vendaId obrigatorio" }, { status: 400 });
  }

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { vendedor: { select: { id: true, nome: true } } },
  });

  if (!venda) {
    return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
  }

  if (venda.status === "PAGO") {
    return NextResponse.json({ error: "Venda ja esta paga" }, { status: 400 });
  }

  // Atualizar status para PAGO
  const updated = await prisma.venda.update({
    where: { id: vendaId },
    data: { status: "PAGO" },
  });

  // Notificar vendedor
  try {
    await prisma.notificacao.create({
      data: {
        userId: venda.vendedorId,
        tipo: "COMISSAO_PAGA",
        mensagem: `Comissao paga: ${venda.cliente} - R$ ${venda.comissaoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        vendaId: venda.id,
      },
    });
  } catch (notifErr) {
    console.error("Erro ao criar notificacao para vendedor:", notifErr);
  }

  return NextResponse.json(updated);
}

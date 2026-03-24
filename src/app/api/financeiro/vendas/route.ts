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
      margem: v.margem,
      over: v.over,
      custoInstalacao: v.custoInstalacao ?? 0,
      custoVisitaTecnica: v.custoVisitaTecnica ?? 120,
      custoCosern: v.custoCosern ?? 70,
      custoTrtCrea: v.custoTrtCrea ?? 65,
      custoEngenheiro: v.custoEngenheiro ?? 400,
      custoMaterialCA: v.custoMaterialCA ?? 500,
      custoImposto: v.custoImposto ?? 0,
      lucroLiquido: v.lucroLiquido ?? 0,
      margemLucroLiquido: v.margemLucroLiquido ?? 0,
      percentualComissaoOverride: v.percentualComissaoOverride,
      mesReferencia: v.mesReferencia,
      excecao: v.excecao,
      historicoAlteracoes: v.historicoAlteracoes,
      comissaoVendaPaga: v.comissaoVendaPaga,
      comissaoOverPaga: v.comissaoOverPaga,
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
 * Marcar comissao como paga (separado: VENDA ou OVER).
 * Body: { vendaId: string, tipo?: "VENDA" | "OVER" }
 * Se tipo não for informado, marca ambas como pagas (compatibilidade).
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessFinanceiro(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { vendaId, tipo } = body;

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

  // Determinar o que marcar como pago
  const updateData: Record<string, unknown> = {};
  let notifMsg = "";

  if (tipo === "VENDA") {
    updateData.comissaoVendaPaga = true;
    notifMsg = `Comissao de venda paga: ${venda.cliente} - R$ ${venda.comissaoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  } else if (tipo === "OVER") {
    updateData.comissaoOverPaga = true;
    notifMsg = `Comissao de over paga: ${venda.cliente} - R$ ${venda.comissaoOver.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  } else {
    // Compatibilidade: marca ambas
    updateData.comissaoVendaPaga = true;
    updateData.comissaoOverPaga = true;
    notifMsg = `Comissao paga: ${venda.cliente} - R$ ${venda.comissaoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  // Verificar se ambas ficaram pagas → status PAGO
  const vendaPaga = tipo === "VENDA" ? true : venda.comissaoVendaPaga;
  const overPaga = tipo === "OVER" ? true : venda.comissaoOverPaga;
  if (vendaPaga && overPaga) {
    updateData.status = "PAGO";
  }

  const updated = await prisma.venda.update({
    where: { id: vendaId },
    data: updateData,
  });

  // Notificar vendedor
  try {
    await prisma.notificacao.create({
      data: {
        userId: venda.vendedorId,
        tipo: "COMISSAO_PAGA",
        mensagem: notifMsg,
        vendaId: venda.id,
      },
    });
  } catch (notifErr) {
    console.error("Erro ao criar notificacao para vendedor:", notifErr);
  }

  return NextResponse.json(updated);
}

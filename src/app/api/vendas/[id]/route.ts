import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isDiretor } from "@/lib/roles";
import { calcularCustosVenda, ConfiguracaoCustos } from "@/lib/custos";

// DELETE - Excluir venda
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const venda = await prisma.venda.findUnique({
    where: { id: params.id },
  });

  if (!venda) {
    return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
  }

  // Apenas admin/diretor ou o proprio vendedor pode excluir
  if (!isAdmin(session.user.role) && venda.vendedorId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  await prisma.venda.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

// PUT - Atualizar venda (admin: status / diretor: status + custos)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { status, quantidadeInversores, custoCosern, custoVisitaTecnica, custoTrtCrea, custoEngenheiro, aliquotaImposto, percentualComissaoOverride } = body;

  const vendaAtual = await prisma.venda.findUnique({
    where: { id: params.id },
  });

  if (!vendaAtual) {
    return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
  }

  const updateData: any = {};

  // Qualquer admin pode atualizar status
  if (status !== undefined) {
    updateData.status = status;
  }

  // Diretor pode editar custos
  if (isDiretor(session.user.role)) {
    if (quantidadeInversores !== undefined) updateData.quantidadeInversores = quantidadeInversores;
    if (custoCosern !== undefined) updateData.custoCosern = custoCosern;
    if (custoVisitaTecnica !== undefined) updateData.custoVisitaTecnica = custoVisitaTecnica;
    if (custoTrtCrea !== undefined) updateData.custoTrtCrea = custoTrtCrea;
    if (custoEngenheiro !== undefined) updateData.custoEngenheiro = custoEngenheiro;
    if (aliquotaImposto !== undefined) updateData.aliquotaImposto = aliquotaImposto;
    if (percentualComissaoOverride !== undefined) updateData.percentualComissaoOverride = percentualComissaoOverride;

    // Se mudou algum custo, recalcular P&L
    const temMudancaCusto = quantidadeInversores !== undefined ||
      custoCosern !== undefined || custoVisitaTecnica !== undefined ||
      custoTrtCrea !== undefined || custoEngenheiro !== undefined || aliquotaImposto !== undefined ||
      percentualComissaoOverride !== undefined;

    if (temMudancaCusto) {
      const config = await prisma.configuracao.findFirst();
      const percentualComissaoVendaPadrao = config?.percentualComissaoVenda ?? 0.025;
      const configCustos: ConfiguracaoCustos = {
        custoPlacaInstalacao: config?.custoPlacaInstalacao ?? 70,
        custoInversorInstalacao: config?.custoInversorInstalacao ?? 250,
        custoVisitaTecnicaPadrao: config?.custoVisitaTecnicaPadrao ?? 120,
        custoCosernPadrao: config?.custoCosernPadrao ?? 70,
        custoTrtCreaPadrao: config?.custoTrtCreaPadrao ?? 65,
        custoEngenheiroPadrao: config?.custoEngenheiroPadrao ?? 400,
        aliquotaImpostoPadrao: config?.aliquotaImpostoPadrao ?? 0.06,
      };

      const novosInversores = quantidadeInversores ?? vendaAtual.quantidadeInversores;

      // Recalcular comissao se override mudou
      const novoOverride = percentualComissaoOverride !== undefined ? percentualComissaoOverride : vendaAtual.percentualComissaoOverride;
      const percentualEfetivo = novoOverride != null ? novoOverride : percentualComissaoVendaPadrao;
      const novaComissaoVenda = vendaAtual.valorVenda * percentualEfetivo;
      const novaComissaoTotal = novaComissaoVenda + vendaAtual.comissaoOver;

      const custos = calcularCustosVenda(
        {
          valorVenda: vendaAtual.valorVenda,
          custoEquipamentos: vendaAtual.custoEquipamentos,
          quantidadePlacas: vendaAtual.quantidadePlacas,
          quantidadeInversores: novosInversores,
          comissaoTotal: novaComissaoTotal,
          custoVisitaTecnicaOverride: custoVisitaTecnica ?? vendaAtual.custoVisitaTecnica,
          custoCosernOverride: custoCosern ?? vendaAtual.custoCosern,
          custoTrtCreaOverride: custoTrtCrea ?? vendaAtual.custoTrtCrea,
          custoEngenheiroOverride: custoEngenheiro ?? vendaAtual.custoEngenheiro,
          aliquotaImpostoOverride: aliquotaImposto ?? vendaAtual.aliquotaImposto,
        },
        configCustos
      );

      updateData.comissaoVenda = novaComissaoVenda;
      updateData.comissaoTotal = novaComissaoTotal;
      updateData.comissaoVendedorCusto = novaComissaoTotal;
      updateData.custoInstalacao = custos.custoInstalacao;
      updateData.custoEngenheiro = custos.custoEngenheiro;
      updateData.custoImposto = custos.custoImposto;
      updateData.lucroLiquido = custos.lucroLiquido;
      updateData.margemLucroLiquido = custos.margemLucroLiquido;
    }
  }

  const venda = await prisma.venda.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(venda);
}

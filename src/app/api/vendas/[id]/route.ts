import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
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

// PUT - Atualizar venda (admin: status + custos / diretor: tudo + margem direta)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    status,
    quantidadePlacas, quantidadeInversores,
    custoCosern, custoVisitaTecnica, custoTrtCrea, custoEngenheiro, custoMaterialCA,
    aliquotaImposto, percentualComissaoOverride,
    // Ajuste de margem (exceção): apenas DIRETOR aplica direto; ADMIN cria solicitação
    novaMargem,
    dataConversao,
  } = body;

  const vendaAtual = await prisma.venda.findUnique({
    where: { id: params.id },
    include: { vendedor: { select: { nome: true } } },
  });

  if (!vendaAtual) {
    return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
  }

  const updateData: any = {};

  // Qualquer admin pode atualizar status
  if (status !== undefined) {
    updateData.status = status;
  }

  // Atualizar data de conversao e recalcular mesReferencia
  if (dataConversao) {
    const novaData = new Date(dataConversao);
    updateData.dataConversao = novaData;
    updateData.mesReferencia = `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, "0")}`;
  }

  // ── ADMIN ou DIRETOR: ajuste direto de margem ──
  // Valor da venda e equipamento NÃO mudam.
  // A margem define o threshold do over: over = valorVenda - (custoEquip × margem)
  if (isAdmin(session.user.role) && novaMargem !== undefined) {
    if (novaMargem <= 0) {
      return NextResponse.json({ error: "Margem invalida" }, { status: 400 });
    }
    const over = Math.max(vendaAtual.valorVenda - vendaAtual.custoEquipamentos * novaMargem, 0);
    const comissaoOver = over * 0.35;
    const comissaoVenda = vendaAtual.valorVenda * (vendaAtual.percentualComissaoOverride ?? 0.025);
    const novaComissaoTotal = comissaoOver + comissaoVenda;

    const outrosCustos =
      (vendaAtual.custoInstalacao ?? 0) +
      (vendaAtual.custoVisitaTecnica ?? 0) +
      (vendaAtual.custoCosern ?? 0) +
      (vendaAtual.custoTrtCrea ?? 0) +
      (vendaAtual.custoEngenheiro ?? 0) +
      (vendaAtual.custoMaterialCA ?? 0) +
      (vendaAtual.custoImposto ?? 0);
    const novoLucro = vendaAtual.valorVenda - vendaAtual.custoEquipamentos - outrosCustos - novaComissaoTotal;
    const novaMargemLucro = vendaAtual.valorVenda > 0 ? novoLucro / vendaAtual.valorVenda : 0;

    updateData.margem = novaMargem;
    updateData.comissaoOver = comissaoOver;
    updateData.comissaoVenda = comissaoVenda;
    updateData.comissaoTotal = novaComissaoTotal;
    updateData.comissaoVendedorCusto = novaComissaoTotal;
    updateData.lucroLiquido = novoLucro;
    updateData.margemLucroLiquido = novaMargemLucro;
  }

  // ── Diretor ou Supervisor: editar custos operacionais ──
  if (isAdmin(session.user.role)) {
    if (quantidadePlacas !== undefined) updateData.quantidadePlacas = quantidadePlacas;
    if (quantidadeInversores !== undefined) updateData.quantidadeInversores = quantidadeInversores;
    if (custoCosern !== undefined) updateData.custoCosern = custoCosern;
    if (custoVisitaTecnica !== undefined) updateData.custoVisitaTecnica = custoVisitaTecnica;
    if (custoTrtCrea !== undefined) updateData.custoTrtCrea = custoTrtCrea;
    if (custoEngenheiro !== undefined) updateData.custoEngenheiro = custoEngenheiro;
    if (custoMaterialCA !== undefined) updateData.custoMaterialCA = custoMaterialCA;
    if (aliquotaImposto !== undefined) updateData.aliquotaImposto = aliquotaImposto;
    if (percentualComissaoOverride !== undefined) updateData.percentualComissaoOverride = percentualComissaoOverride;

    const temMudancaCusto = quantidadePlacas !== undefined || quantidadeInversores !== undefined ||
      custoCosern !== undefined || custoVisitaTecnica !== undefined ||
      custoTrtCrea !== undefined || custoEngenheiro !== undefined || custoMaterialCA !== undefined ||
      aliquotaImposto !== undefined || percentualComissaoOverride !== undefined;

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
        custoMaterialCAPadrao: config?.custoMaterialCAPadrao ?? 500,
        aliquotaImpostoPadrao: config?.aliquotaImpostoPadrao ?? 0.06,
      };

      const novasPlacas = quantidadePlacas ?? vendaAtual.quantidadePlacas;
      const novosInversores = quantidadeInversores ?? vendaAtual.quantidadeInversores;

      const novoOverride = percentualComissaoOverride !== undefined ? percentualComissaoOverride : vendaAtual.percentualComissaoOverride;
      const percentualEfetivo = novoOverride != null ? novoOverride : percentualComissaoVendaPadrao;
      const novaComissaoVenda = vendaAtual.valorVenda * percentualEfetivo;
      const novaComissaoTotal = novaComissaoVenda + vendaAtual.comissaoOver;

      const custos = calcularCustosVenda(
        {
          valorVenda: vendaAtual.valorVenda,
          custoEquipamentos: vendaAtual.custoEquipamentos,
          quantidadePlacas: novasPlacas,
          quantidadeInversores: novosInversores,
          comissaoTotal: novaComissaoTotal,
          custoVisitaTecnicaOverride: custoVisitaTecnica ?? vendaAtual.custoVisitaTecnica,
          custoCosernOverride: custoCosern ?? vendaAtual.custoCosern,
          custoTrtCreaOverride: custoTrtCrea ?? vendaAtual.custoTrtCrea,
          custoEngenheiroOverride: custoEngenheiro ?? vendaAtual.custoEngenheiro,
          custoMaterialCAOverride: custoMaterialCA ?? vendaAtual.custoMaterialCA,
          aliquotaImpostoOverride: aliquotaImposto ?? vendaAtual.aliquotaImposto,
        },
        configCustos
      );

      updateData.comissaoVenda = novaComissaoVenda;
      updateData.comissaoTotal = novaComissaoTotal;
      updateData.comissaoVendedorCusto = novaComissaoTotal;
      updateData.custoInstalacao = custos.custoInstalacao;
      updateData.custoEngenheiro = custos.custoEngenheiro;
      updateData.custoMaterialCA = custos.custoMaterialCA;
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

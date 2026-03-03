import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularOver, calcularMargem, calcularGeracaoKwh } from "@/lib/comissao";
import { calcularCustosVenda, ConfiguracaoCustos } from "@/lib/custos";
import { isAdmin } from "@/lib/roles";
import { tentarVincularVendaSDR } from "@/lib/sdr-linking";

// GET - Listar vendas do vendedor logado (ou todas se admin/diretor)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const vendedorFiltro = searchParams.get("vendedor");

  const where: any = {};

  // Se nao e admin/diretor, mostra apenas as vendas do vendedor
  if (!isAdmin(session.user.role)) {
    where.vendedorId = session.user.id;
  } else if (vendedorFiltro) {
    // Admin/diretor pode filtrar por vendedor especifico
    where.vendedorId = vendedorFiltro;
  }

  if (mes) {
    where.mesReferencia = mes;
  }

  const vendas = await prisma.venda.findMany({
    where,
    include: { vendedor: { select: { nome: true, email: true } } },
    orderBy: { dataConversao: "desc" },
  });

  return NextResponse.json(vendas);
}

// POST - Criar nova venda
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      cliente,
      formaPagamento,
      distribuidora,
      valorVenda,
      kwp,
      custoEquipamentos,
      quantidadePlacas,
      dataConversao,
      fonte,
    } = body;

    // Validacoes
    if (!cliente || !valorVenda || !custoEquipamentos) {
      return NextResponse.json(
        { error: "Campos obrigatorios faltando" },
        { status: 400 }
      );
    }

    // Buscar configuracao
    const config = await prisma.configuracao.findFirst();
    const fatorMultiplicador = config?.fatorMultiplicador ?? 1.8;
    const fatorGeracao = config?.fatorGeracao ?? 136;
    const percentualComissaoVenda = config?.percentualComissaoVenda ?? 0.025;

    // Calcular campos de comissao
    const vVenda = parseFloat(valorVenda);
    const vEquip = parseFloat(custoEquipamentos);
    const vKwp = parseFloat(kwp) || 0;
    const vPlacas = parseInt(quantidadePlacas) || 0;

    const margem = calcularMargem(vVenda, vEquip);
    const over = margem >= 1.8 ? calcularOver(vVenda, vEquip, fatorMultiplicador) : 0;
    const geracaoKwh = calcularGeracaoKwh(vKwp, fatorGeracao);
    const comissaoVenda = vVenda * percentualComissaoVenda;

    // Determinar mes de referencia
    const data = new Date(dataConversao);
    const mesReferencia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    // Calcular custos (visao diretor) usando config padrao
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

    const custos = calcularCustosVenda(
      {
        valorVenda: vVenda,
        custoEquipamentos: vEquip,
        quantidadePlacas: vPlacas,
        quantidadeInversores: 1,
        comissaoTotal: comissaoVenda, // por enquanto so a comissao base, sera recalculado
      },
      configCustos
    );

    const venda = await prisma.venda.create({
      data: {
        vendedorId: session.user.id,
        cliente,
        formaPagamento: formaPagamento || "",
        distribuidora: distribuidora || "",
        valorVenda: vVenda,
        kwp: vKwp,
        custoEquipamentos: vEquip,
        geracaoKwh,
        over,
        margem,
        comissaoVenda,
        comissaoOver: 0,
        comissaoTotal: comissaoVenda,
        // Novos campos de custo
        quantidadePlacas: vPlacas,
        quantidadeInversores: 1,
        custoInstalacao: custos.custoInstalacao,
        custoVisitaTecnica: custos.custoVisitaTecnica,
        custoCosern: custos.custoCosern,
        custoTrtCrea: custos.custoTrtCrea,
        custoEngenheiro: custos.custoEngenheiro,
        custoMaterialCA: custos.custoMaterialCA,
        aliquotaImposto: configCustos.aliquotaImpostoPadrao,
        custoImposto: custos.custoImposto,
        comissaoVendedorCusto: comissaoVenda,
        lucroLiquido: custos.lucroLiquido,
        margemLucroLiquido: custos.margemLucroLiquido,
        dataConversao: data,
        fonte: fonte || "",
        mesReferencia,
      },
    });

    // Recalcular comissoes do mes para o vendedor
    await recalcularComissoesMes(session.user.id, mesReferencia);

    // Tentar vincular automaticamente a um registro SDR
    await tentarVincularVendaSDR(venda.id);

    // Notificar todos os usuarios FINANCEIRO sobre nova venda
    try {
      const financeiros = await prisma.user.findMany({
        where: { role: "FINANCEIRO", ativo: true },
        select: { id: true },
      });
      if (financeiros.length > 0) {
        await prisma.notificacao.createMany({
          data: financeiros.map((f) => ({
            userId: f.id,
            tipo: "NOVA_VENDA",
            mensagem: `Nova venda: ${cliente} - R$ ${vVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            vendaId: venda.id,
          })),
        });
      }
    } catch (notifErr) {
      console.error("Erro ao criar notificacoes para financeiro:", notifErr);
    }

    return NextResponse.json(venda, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar venda:", error);
    return NextResponse.json(
      { error: "Erro ao criar venda: " + error.message },
      { status: 500 }
    );
  }
}

// Funcao para recalcular comissoes e custos de um mes inteiro
async function recalcularComissoesMes(vendedorId: string, mesReferencia: string) {
  const vendas = await prisma.venda.findMany({
    where: { vendedorId, mesReferencia },
    orderBy: { dataConversao: "asc" },
  });

  const config = await prisma.configuracao.findFirst();
  const percentualComissaoVenda = config?.percentualComissaoVenda ?? 0.025;

  const faixas = await prisma.faixaComissao.findMany({
    where: { ativa: true },
    orderBy: { ordem: "asc" },
  });

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

  const totalVendido = vendas.reduce((sum, v) => sum + v.valorVenda, 0);

  // Calcular comissao over progressiva (sem regra de volume minimo)
  const totalOver = vendas.reduce((sum, v) => sum + v.over, 0);

  let percentualOverMedio = 0;
  if (totalOver > 0) {
    let comissaoOverTotal = 0;

    for (const faixa of faixas) {
      if (totalVendido <= faixa.volumeMinimo) break;

      const limiteSuperior = faixa.volumeMaximo ?? Infinity;
      const volumeNaFaixa = Math.min(totalVendido, limiteSuperior) - faixa.volumeMinimo;

      if (volumeNaFaixa <= 0) continue;

      const proporcao = volumeNaFaixa / totalVendido;
      const overNaFaixa = totalOver * proporcao;
      comissaoOverTotal += overNaFaixa * faixa.percentualOver;
    }

    percentualOverMedio = totalOver > 0 ? comissaoOverTotal / totalOver : 0;
  }

  // Atualizar cada venda com sua comissao proporcional + custos
  for (const venda of vendas) {
    const percentualEfetivo = venda.percentualComissaoOverride != null ? venda.percentualComissaoOverride : percentualComissaoVenda;
    const comissaoVenda = venda.valorVenda * percentualEfetivo;
    const comissaoOver = venda.over * percentualOverMedio;
    const comissaoTotal = comissaoVenda + comissaoOver;

    const custos = calcularCustosVenda(
      {
        valorVenda: venda.valorVenda,
        custoEquipamentos: venda.custoEquipamentos,
        quantidadePlacas: venda.quantidadePlacas,
        quantidadeInversores: venda.quantidadeInversores,
        comissaoTotal: comissaoTotal,
        custoInstalacaoOverride: venda.custoInstalacao,
        custoVisitaTecnicaOverride: venda.custoVisitaTecnica,
        custoCosernOverride: venda.custoCosern,
        custoTrtCreaOverride: venda.custoTrtCrea,
        custoEngenheiroOverride: venda.custoEngenheiro,
        custoMaterialCAOverride: venda.custoMaterialCA,
        aliquotaImpostoOverride: venda.aliquotaImposto,
      },
      configCustos
    );

    await prisma.venda.update({
      where: { id: venda.id },
      data: {
        comissaoVenda,
        comissaoOver,
        comissaoTotal,
        comissaoVendedorCusto: comissaoTotal,
        custoInstalacao: custos.custoInstalacao,
        custoEngenheiro: custos.custoEngenheiro,
        custoMaterialCA: custos.custoMaterialCA,
        custoImposto: custos.custoImposto,
        lucroLiquido: custos.lucroLiquido,
        margemLucroLiquido: custos.margemLucroLiquido,
      },
    });
  }
}

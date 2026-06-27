import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularOver, calcularMargem, calcularGeracaoKwh, PERCENTUAL_OVER_EXTERNA } from "@/lib/comissao";
import { calcularCustosVenda, ConfiguracaoCustos } from "@/lib/custos";
import { calcularCustoInstalacaoEstimado, type BitolaCabo } from "@/lib/margem-instalacao";
import { isSupervisor } from "@/lib/roles";
import { tentarVincularVendaSDR } from "@/lib/sdr-linking";

// GET - Listar vendas do vendedor logado (ou todas se admin/diretor)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const vendedorFiltro = searchParams.get("vendedor");

  const where: any = {};

  // Admin/diretor/supervisor veem todas; demais (vendedor) apenas as proprias.
  if (!isSupervisor(session.user.role)) {
    where.vendedorId = session.user.id;
  } else if (vendedorFiltro) {
    // Admin/diretor/supervisor pode filtrar por vendedor especifico
    where.vendedorId = vendedorFiltro;
  }

  // Filtro por range customizado tem precedencia sobre mes (UI nova)
  if (startDate && endDate) {
    where.dataConversao = {
      gte: new Date(`${startDate}T00:00:00`),
      lte: new Date(`${endDate}T23:59:59.999`),
    };
  } else if (mes) {
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
      orcamentoUrl,
      tipoVenda,
      statusContrato,
      // Margem de instalacao (engenharia)
      metragemCaboPrevista,
      bitolaCabo,
      inversorTrifasico,
      cidadeInstalacao,
    } = body;

    // Validacoes
    if (!cliente || !valorVenda || !custoEquipamentos) {
      return NextResponse.json(
        { error: "Campos obrigatorios faltando" },
        { status: 400 }
      );
    }

    // Para vendedor hibrido, tipoVenda eh obrigatorio (INBOUND ou EXTERNA)
    const vendedorAtual = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const isHibrido = vendedorAtual?.role === "VENDEDOR_HIBRIDO";
    let tipoVendaFinal: "INBOUND" | "EXTERNA" = "INBOUND";
    if (isHibrido) {
      if (tipoVenda !== "INBOUND" && tipoVenda !== "EXTERNA") {
        return NextResponse.json(
          { error: "tipoVenda obrigatorio (INBOUND ou EXTERNA) para vendedor hibrido" },
          { status: 400 }
        );
      }
      tipoVendaFinal = tipoVenda;
    } else if (tipoVenda === "EXTERNA" || tipoVenda === "INBOUND") {
      // Permite override explicito (ex: admin migrando dado)
      tipoVendaFinal = tipoVenda;
    }

    // Fonte: EXTERNA auto-seta "EXTERNO"; demais devem ser TRAFEGO ou INDICACAO
    let fonteFinal = fonte;
    if (tipoVendaFinal === "EXTERNA") {
      fonteFinal = "EXTERNO";
    } else if (
      fonteFinal !== "TRAFEGO" &&
      fonteFinal !== "INDICACAO" &&
      fonteFinal !== "FOLLOWUP"
    ) {
      return NextResponse.json(
        { error: "Fonte do lead obrigatoria (TRAFEGO, INDICACAO ou FOLLOWUP)" },
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
    // EXTERNA: over flat 50% por venda. INBOUND: over progressivo, calculado mensalmente.
    const comissaoOverVenda = tipoVendaFinal === "EXTERNA" ? over * PERCENTUAL_OVER_EXTERNA : 0;
    const comissaoTotalVenda = comissaoVenda + comissaoOverVenda;

    // Status do contrato: COMPLETO (default) ou A_FINALIZAR
    const statusContratoFinal =
      statusContrato === "A_FINALIZAR" ? "A_FINALIZAR" : "COMPLETO";

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
        comissaoTotal: comissaoTotalVenda, // ja inclui over EXTERNA quando aplicavel
      },
      configCustos
    );

    // Custo estimado de instalacao (se vendedor preencheu metragem/bitola)
    let custoInstalacaoEstimado: number | null = null;
    const metragemNum = parseInt(metragemCaboPrevista);
    if (!isNaN(metragemNum) && metragemNum > 0 && (bitolaCabo === "6mm" || bitolaCabo === "10mm")) {
      const [precos, deslocamentos] = await Promise.all([
        prisma.precoMaterial.findMany({ where: { ativo: true } }),
        prisma.custoDeslocamento.findMany(),
      ]);
      custoInstalacaoEstimado = calcularCustoInstalacaoEstimado(
        {
          metragemCaboPrevista: metragemNum,
          bitolaCabo: bitolaCabo as BitolaCabo,
          inversorTrifasico: !!inversorTrifasico,
          cidadeInstalacao: cidadeInstalacao?.trim() || undefined,
        },
        precos,
        deslocamentos
      );
    }

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
        comissaoOver: comissaoOverVenda,
        comissaoTotal: comissaoTotalVenda,
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
        fonte: fonteFinal,
        tipoVenda: tipoVendaFinal,
        statusContrato: statusContratoFinal,
        dataFinalizacaoContrato: statusContratoFinal === "COMPLETO" ? data : null,
        orcamentoUrl: orcamentoUrl || null,
        mesReferencia,
        // Margem de instalacao
        metragemCaboPrevista: !isNaN(metragemNum) && metragemNum > 0 ? metragemNum : null,
        bitolaCabo: (bitolaCabo === "6mm" || bitolaCabo === "10mm") ? bitolaCabo : null,
        inversorTrifasico: !!inversorTrifasico,
        cidadeInstalacao: cidadeInstalacao?.trim() || null,
        custoInstalacaoEstimado,
      },
    });

    // Recalcular comissoes do mes para o vendedor
    await recalcularComissoesMes(session.user.id, mesReferencia);

    // Tentar vincular automaticamente a um registro SDR
    await tentarVincularVendaSDR(venda.id);

    // Auto-criar registro no Setor Tecnico
    try {
      await prisma.setorTecnico.create({
        data: {
          nomeCliente: cliente,
          vendaId: venda.id,
          vendedorNome: session.user.name || "",
          // Card nasce ja nos dois trilhos: Projetos (Novo Projeto) e
          // Instalacoes (Agendar Visita). Aparece em ambas as abas desde a
          // criacao — Pedro nao precisa abrir manualmente o trilho de campo.
          etapa: "NOVO_PROJETO",
          etapaInstalacao: "AGENDAR_VISITA",
        },
      });
    } catch (tecErr) {
      console.error("Erro ao criar registro no setor tecnico:", tecErr);
    }

    // Auto-criar registro no Pos Venda
    try {
      // Buscar primeiro operador POS_VENDA ativo, senao usa o proprio vendedor
      const operadorPV = await prisma.user.findFirst({
        where: { role: "POS_VENDA", ativo: true },
        select: { id: true },
      });
      // Prazo de 2 dias para finalizacao
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + 2);
      const prazoStr = prazo.toISOString().split("T")[0];

      const checklistPadrao = JSON.stringify([
        { key: "visita_tecnica",     label: "Visita Técnica",       concluido: false },
        { key: "solicitacao_cosern", label: "Solicitação Cosern",   concluido: false },
        { key: "card_fechado",       label: "Card Fechado",         concluido: false },
        { key: "contrato_assinado",  label: "Contrato Assinado",    concluido: false },
      ]);

      await prisma.posVenda.create({
        data: {
          operadorId: operadorPV?.id ?? session.user.id,
          nomeCliente: cliente,
          vendaId: venda.id,
          etapa: "TRAMITES",
          proximoContato: prazoStr,
          prazoFinalizacao: prazoStr,
          checklistSupervisao: checklistPadrao,
        },
      });
    } catch (pvErr) {
      console.error("Erro ao criar registro no pos venda:", pvErr);
    }

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

  // Split inbound vs externa. EXTERNA (so vendedor hibrido) usa over flat 50%
  // e NAO entra na faixa progressiva. INBOUND segue progressivo sobre volume
  // inbound isolado.
  const vendasInbound = vendas.filter((v) => v.tipoVenda !== "EXTERNA");
  const volumeInbound = vendasInbound.reduce((sum, v) => sum + v.valorVenda, 0);
  const totalOverInbound = vendasInbound.reduce((sum, v) => sum + v.over, 0);

  let percentualOverMedioInbound = 0;
  if (totalOverInbound > 0 && volumeInbound > 0) {
    let comissaoOverTotalInbound = 0;

    for (const faixa of faixas) {
      if (volumeInbound <= faixa.volumeMinimo) break;

      const limiteSuperior = faixa.volumeMaximo ?? Infinity;
      const volumeNaFaixa = Math.min(volumeInbound, limiteSuperior) - faixa.volumeMinimo;

      if (volumeNaFaixa <= 0) continue;

      const proporcao = volumeNaFaixa / volumeInbound;
      const overNaFaixa = totalOverInbound * proporcao;
      comissaoOverTotalInbound += overNaFaixa * faixa.percentualOver;
    }

    percentualOverMedioInbound = comissaoOverTotalInbound / totalOverInbound;
  }

  // Atualizar cada venda com sua comissao proporcional + custos
  for (const venda of vendas) {
    const percentualEfetivo = venda.percentualComissaoOverride != null ? venda.percentualComissaoOverride : percentualComissaoVenda;
    const comissaoVenda = venda.valorVenda * percentualEfetivo;
    const comissaoOver =
      venda.tipoVenda === "EXTERNA"
        ? venda.over * PERCENTUAL_OVER_EXTERNA
        : venda.over * percentualOverMedioInbound;
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

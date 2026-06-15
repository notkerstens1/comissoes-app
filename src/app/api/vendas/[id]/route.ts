import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canEditVenda } from "@/lib/roles";
import { PERCENTUAL_OVER_EXTERNA } from "@/lib/comissao";
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
  if (!session || !canEditVenda(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    status,
    quantidadePlacas, quantidadeInversores,
    custoCosern, custoVisitaTecnica, custoTrtCrea, custoEngenheiro, custoMaterialCA,
    aliquotaImposto, percentualComissaoOverride,
    novaMargem,
    dataConversao,
    motivo,
    excecao,
    valorVenda: novoValorVenda,
    custoEquipamentos: novoCustoEquipamentos,
    // Campos basicos editaveis (diretor/admin/financeiro)
    cliente, fonte, tipoVenda, distribuidora, formaPagamento, kwp,
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

  // ── Editar campos basicos (cliente, fonte, tipoVenda, distribuidora, formaPagamento, kwp) ──
  if (cliente !== undefined && typeof cliente === "string" && cliente.trim().length > 0) {
    updateData.cliente = cliente.trim();
  }
  if (fonte !== undefined) {
    if (fonte !== "TRAFEGO" && fonte !== "INDICACAO" && fonte !== "FOLLOWUP" && fonte !== "EXTERNO") {
      return NextResponse.json({ error: "fonte invalida (TRAFEGO, INDICACAO, FOLLOWUP ou EXTERNO)" }, { status: 400 });
    }
    updateData.fonte = fonte;
  }
  if (tipoVenda !== undefined) {
    if (tipoVenda !== "INBOUND" && tipoVenda !== "EXTERNA") {
      return NextResponse.json({ error: "tipoVenda invalido (INBOUND ou EXTERNA)" }, { status: 400 });
    }
    updateData.tipoVenda = tipoVenda;
    // EXTERNA implica fonte=EXTERNO; INBOUND nao volta automatico (precisa selecionar TRAFEGO/INDICACAO)
    if (tipoVenda === "EXTERNA") {
      updateData.fonte = "EXTERNO";
    }
  }
  if (distribuidora !== undefined) updateData.distribuidora = String(distribuidora);
  if (formaPagamento !== undefined) updateData.formaPagamento = String(formaPagamento);
  if (kwp !== undefined && !isNaN(parseFloat(kwp))) {
    updateData.kwp = parseFloat(kwp);
  }

  // ── Editar valor da venda e custo equipamentos ──
  if (novoValorVenda !== undefined) updateData.valorVenda = novoValorVenda;
  if (novoCustoEquipamentos !== undefined) updateData.custoEquipamentos = novoCustoEquipamentos;

  // Se tipoVenda mudou sem mudar valor/equip, recalcular comissaoOver com o novo
  // percentual (EXTERNA: 50% flat, INBOUND: 35% como aproximacao da faixa base).
  if (tipoVenda !== undefined && tipoVenda !== vendaAtual.tipoVenda
      && novoValorVenda === undefined && novoCustoEquipamentos === undefined
      && novaMargem === undefined) {
    const overAtual = vendaAtual.over;
    const novoPercentualOver = tipoVenda === "EXTERNA" ? PERCENTUAL_OVER_EXTERNA : 0.35;
    const novaComissaoOver = overAtual * novoPercentualOver;
    updateData.comissaoOver = novaComissaoOver;
    updateData.comissaoTotal = vendaAtual.comissaoVenda + novaComissaoOver;
    updateData.comissaoVendedorCusto = updateData.comissaoTotal;
  }

  // Se valor ou equipamento mudou, recalcular margem, over e comissões
  if ((novoValorVenda !== undefined || novoCustoEquipamentos !== undefined) && novaMargem === undefined) {
    const vv = novoValorVenda ?? vendaAtual.valorVenda;
    const ce = novoCustoEquipamentos ?? vendaAtual.custoEquipamentos;
    const newMargem = ce > 0 ? vv / ce : 0;
    const fator = vendaAtual.percentualComissaoOverride ?? 0.025;
    const newOver = Math.max(vv - ce * 1.8, 0);
    const newComissaoVenda = vv * fator;
    const tipoVendaEfetivo = updateData.tipoVenda ?? vendaAtual.tipoVenda;
    const percentualOver = tipoVendaEfetivo === "EXTERNA" ? PERCENTUAL_OVER_EXTERNA : 0.35;
    const newComissaoOver = newOver * percentualOver;
    const newComissaoTotal = newComissaoVenda + newComissaoOver;
    const outrosCustos =
      (vendaAtual.custoInstalacao ?? 0) + (vendaAtual.custoVisitaTecnica ?? 0) +
      (vendaAtual.custoCosern ?? 0) + (vendaAtual.custoTrtCrea ?? 0) +
      (vendaAtual.custoEngenheiro ?? 0) + (vendaAtual.custoMaterialCA ?? 0) +
      (vendaAtual.custoImposto ?? 0);
    const newLucro = vv - ce - outrosCustos - newComissaoTotal;
    const newMargemLucro = vv > 0 ? newLucro / vv : 0;

    updateData.margem = Math.round(newMargem * 100) / 100;
    updateData.over = newOver;
    updateData.comissaoVenda = newComissaoVenda;
    updateData.comissaoOver = newComissaoOver;
    updateData.comissaoTotal = newComissaoTotal;
    updateData.comissaoVendedorCusto = newComissaoTotal;
    updateData.geracaoKwh = vendaAtual.geracaoKwh;
    updateData.lucroLiquido = newLucro;
    updateData.margemLucroLiquido = newMargemLucro;
  }

  // ── Ajuste direto de margem ──
  if (novaMargem !== undefined) {
    if (novaMargem <= 0) {
      return NextResponse.json({ error: "Margem invalida" }, { status: 400 });
    }
    const overBruto = Math.max(vendaAtual.valorVenda - vendaAtual.custoEquipamentos * novaMargem, 0);
    // Se margem < 1.8 e não é exceção → over = 0
    const over = (novaMargem < 1.8 && !excecao) ? 0 : overBruto;
    // Vendas EXTERNA (vendedor hibrido — porta a porta) usam over flat de 50%.
    // INBOUND aplica 35% aqui como aproximacao da faixa base (recalculo mensal
    // ajusta para a faixa progressiva correta).
    const tipoVendaEfetivo = updateData.tipoVenda ?? vendaAtual.tipoVenda;
    const percentualOver = tipoVendaEfetivo === "EXTERNA" ? PERCENTUAL_OVER_EXTERNA : 0.35;
    const comissaoOver = over * percentualOver;
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
    updateData.over = over;
    updateData.comissaoOver = comissaoOver;
    updateData.comissaoVenda = comissaoVenda;
    updateData.comissaoTotal = novaComissaoTotal;
    updateData.comissaoVendedorCusto = novaComissaoTotal;
    updateData.lucroLiquido = novoLucro;
    updateData.margemLucroLiquido = novaMargemLucro;
  }

  // ── Editar custos operacionais ──
  if (canEditVenda(session.user.role)) {
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

  // ── Histórico de alterações ──
  if (motivo && Object.keys(updateData).length > 0) {
    const camposEditaveis = [
      "valorVenda", "custoEquipamentos", "margem", "over", "comissaoOver", "comissaoVenda", "comissaoTotal",
      "quantidadePlacas", "quantidadeInversores", "custoInstalacao", "custoVisitaTecnica",
      "custoCosern", "custoTrtCrea", "custoEngenheiro", "custoMaterialCA", "custoImposto",
      "percentualComissaoOverride", "lucroLiquido", "margemLucroLiquido", "dataConversao", "status", "excecao",
      "cliente", "fonte", "tipoVenda", "distribuidora", "formaPagamento", "kwp",
    ];
    const alteracoes: { campo: string; de: unknown; para: unknown }[] = [];
    for (const campo of camposEditaveis) {
      if (updateData[campo] !== undefined) {
        const valorAnterior = (vendaAtual as any)[campo];
        const valorNovo = updateData[campo];
        if (valorAnterior !== valorNovo) {
          alteracoes.push({ campo, de: valorAnterior, para: valorNovo });
        }
      }
    }
    if (alteracoes.length > 0) {
      const historico = vendaAtual.historicoAlteracoes
        ? JSON.parse(vendaAtual.historicoAlteracoes)
        : [];
      historico.push({
        usuario: session.user.name || "Desconhecido",
        role: session.user.role,
        data: new Date().toISOString(),
        alteracoes,
        motivo,
      });
      updateData.historicoAlteracoes = JSON.stringify(historico);
    }
  }

  // ── Exceção ──
  if (excecao !== undefined) {
    updateData.excecao = excecao;
  }

  // Safety net: se qualquer ramo tocou comissaoVenda ou comissaoOver,
  // forçar comissaoTotal = comissaoVenda + comissaoOver. Evita dessincronia
  // silenciosa entre as 3 colunas que alimenta o modal de Editar Venda.
  if (updateData.comissaoVenda !== undefined || updateData.comissaoOver !== undefined) {
    const cv = updateData.comissaoVenda ?? vendaAtual.comissaoVenda;
    const co = updateData.comissaoOver ?? vendaAtual.comissaoOver;
    const total = cv + co;
    updateData.comissaoTotal = total;
    updateData.comissaoVendedorCusto = total;
  }

  const venda = await prisma.venda.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(venda);
}

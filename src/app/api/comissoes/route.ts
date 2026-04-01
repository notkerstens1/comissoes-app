import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularComissaoMensal, FaixaComissao, ConfiguracaoComissao } from "@/lib/comissao";
import { isAdmin } from "@/lib/roles";

// GET - Resumo de comissões do mês
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") || getCurrentMonth();
  const vendedorId = searchParams.get("vendedorId") || session.user.id;

  // Se não é admin, só pode ver as próprias comissões
  if (!isAdmin(session.user.role) && vendedorId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Buscar vendas do mês
  const vendas = await prisma.venda.findMany({
    where: { vendedorId, mesReferencia: mes },
    orderBy: { dataConversao: "asc" },
  });

  // Buscar configuração e faixas
  const configDb = await prisma.configuracao.findFirst();
  const faixasDb = await prisma.faixaComissao.findMany({
    where: { ativa: true },
    orderBy: { ordem: "asc" },
  });

  const config: ConfiguracaoComissao = {
    fatorMultiplicador: configDb?.fatorMultiplicador ?? 1.8,
    fatorGeracao: configDb?.fatorGeracao ?? 136,
    percentualComissaoVenda: configDb?.percentualComissaoVenda ?? 0.025,
    volumeMinimoComissao: configDb?.volumeMinimoComissao ?? 60000,
  };

  const faixas: FaixaComissao[] = faixasDb.map((f) => ({
    ordem: f.ordem,
    volumeMinimo: f.volumeMinimo,
    volumeMaximo: f.volumeMaximo,
    percentualOver: f.percentualOver,
    ativa: f.ativa,
  }));

  const vendasParaCalculo = vendas.map((v) => ({
    valorVenda: v.valorVenda,
    over: v.over,
    margem: v.margem,
    custoEquipamentos: v.custoEquipamentos,
  }));

  const resultado = calcularComissaoMensal(vendasParaCalculo, faixas, config);

  return NextResponse.json({
    mes,
    vendedorId,
    ...resultado,
    vendas: vendas.map((v) => ({
      id: v.id,
      cliente: v.cliente,
      valorVenda: v.valorVenda,
      margem: v.margem,
      over: v.over,
      comissaoVenda: v.comissaoVenda,
      comissaoOver: v.comissaoOver,
      comissaoTotal: v.comissaoTotal,
      dataConversao: v.dataConversao,
      status: v.status,
      comissaoVendaPaga: v.comissaoVendaPaga,
      comissaoOverPaga: v.comissaoOverPaga,
    })),
  });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

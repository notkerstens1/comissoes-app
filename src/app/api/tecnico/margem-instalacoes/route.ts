import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";
import { resolverEstimadoMaterialCA } from "@/lib/margem-instalacao";

// GET — "caixao de material": cards do setor tecnico que passaram por
// "Material CA Comprado", com o custo real lancado pelo Pedro no card.
// Substitui a versao antiga (baseada em Venda + metragem de cabo, que nunca
// tinha dado). Agora le direto do card. Filtro por DATA DE CRIACAO do card.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status"); // VERDE | AMARELO | VERMELHO

  const where: any = {
    ativo: true,
    // Aparece quem ja tem custo lancado OU esta na etapa de material comprado
    OR: [
      { custoMaterialReal: { not: null } },
      { etapaInstalacao: "MATERIAL_COMPRADO" },
    ],
  };
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(`${startDate}T00:00:00`),
      lte: new Date(`${endDate}T23:59:59.999`),
    };
  }
  if (status) where.statusMaterial = status;

  const cards = await prisma.setorTecnico.findMany({
    where,
    select: {
      id: true,
      nomeCliente: true,
      codigoLocalizador: true,
      vendedorNome: true,
      createdAt: true,
      etapaInstalacao: true,
      custoMaterialReal: true,
      statusMaterial: true,
      faixaInversorCA: true,
      venda: { select: { cliente: true, valorVenda: true, cidadeInstalacao: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Custo padrao de material CA (referencia pro "estimado"), resolvido por faixa
  // de inversor ao vivo: <=7kW -> 550, >7kW -> 700, sem faixa -> padrao (500).
  const config = await prisma.configuracao.findFirst({
    select: {
      custoMaterialCAPadrao: true,
      custoMaterialCAAte7kw: true,
      custoMaterialCAAcima7kw: true,
    },
  });
  const configCA = {
    custoMaterialCAPadrao: config?.custoMaterialCAPadrao ?? 500,
    custoMaterialCAAte7kw: config?.custoMaterialCAAte7kw ?? 550,
    custoMaterialCAAcima7kw: config?.custoMaterialCAAcima7kw ?? 700,
  };
  const padraoUnitario = configCA.custoMaterialCAPadrao;

  // Estimado por card (resolvido pela faixa do inversor)
  const cardsComEstimado = cards.map((c) => ({
    ...c,
    estimado: resolverEstimadoMaterialCA(c.faixaInversorCA, configCA),
  }));

  const comCusto = cardsComEstimado.filter((c) => c.custoMaterialReal != null).length;
  const totalReal = cardsComEstimado.reduce((s, c) => s + (c.custoMaterialReal ?? 0), 0);
  // Total estimado = soma do estimado tiered SO dos cards com custo lancado
  const totalEstimado = cardsComEstimado
    .filter((c) => c.custoMaterialReal != null)
    .reduce((s, c) => s + c.estimado, 0);
  const verde = cardsComEstimado.filter((c) => c.statusMaterial === "VERDE").length;
  const amarelo = cardsComEstimado.filter((c) => c.statusMaterial === "AMARELO").length;
  const vermelho = cardsComEstimado.filter((c) => c.statusMaterial === "VERMELHO").length;

  return NextResponse.json({
    cards: cardsComEstimado,
    resumo: {
      total: cardsComEstimado.length,
      comCusto,
      verde,
      amarelo,
      vermelho,
      padraoUnitario,
      totalEstimado,
      totalReal,
      delta: totalReal - totalEstimado,
    },
  });
}

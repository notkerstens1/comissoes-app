import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET - Buscar configuracoes
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  let config = await prisma.configuracao.findFirst();

  if (!config) {
    config = await prisma.configuracao.create({
      data: {
        id: "config_principal",
        fatorMultiplicador: 1.8,
        fatorGeracao: 136,
        percentualComissaoVenda: 0.025,
        volumeMinimoComissao: 60000,
        custoPlacaInstalacao: 70,
        custoInversorInstalacao: 250,
        custoVisitaTecnicaPadrao: 120,
        custoCosernPadrao: 70,
        custoTrtCreaPadrao: 65,
        custoEngenheiroPadrao: 400,
        custoMaterialCAPadrao: 500,
        aliquotaImpostoPadrao: 0.06,
      },
    });
  }

  return NextResponse.json(config);
}

// PUT - Atualizar configuracoes (admin/diretor)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    fatorMultiplicador,
    fatorGeracao,
    percentualComissaoVenda,
    volumeMinimoComissao,
    // Novos campos de custos
    custoPlacaInstalacao,
    custoInversorInstalacao,
    custoVisitaTecnicaPadrao,
    custoCosernPadrao,
    custoTrtCreaPadrao,
    custoEngenheiroPadrao,
    custoMaterialCAPadrao,
    aliquotaImpostoPadrao,
  } = body;

  // Validar fator multiplicador (1.6 a 1.8)
  if (fatorMultiplicador !== undefined && (fatorMultiplicador < 1.6 || fatorMultiplicador > 1.8)) {
    return NextResponse.json(
      { error: "Fator multiplicador deve estar entre 1.6 e 1.8" },
      { status: 400 }
    );
  }

  const config = await prisma.configuracao.upsert({
    where: { id: "config_principal" },
    update: {
      ...(fatorMultiplicador !== undefined && { fatorMultiplicador }),
      ...(fatorGeracao !== undefined && { fatorGeracao }),
      ...(percentualComissaoVenda !== undefined && { percentualComissaoVenda }),
      ...(volumeMinimoComissao !== undefined && { volumeMinimoComissao }),
      ...(custoPlacaInstalacao !== undefined && { custoPlacaInstalacao }),
      ...(custoInversorInstalacao !== undefined && { custoInversorInstalacao }),
      ...(custoVisitaTecnicaPadrao !== undefined && { custoVisitaTecnicaPadrao }),
      ...(custoCosernPadrao !== undefined && { custoCosernPadrao }),
      ...(custoTrtCreaPadrao !== undefined && { custoTrtCreaPadrao }),
      ...(custoEngenheiroPadrao !== undefined && { custoEngenheiroPadrao }),
      ...(custoMaterialCAPadrao !== undefined && { custoMaterialCAPadrao }),
      ...(aliquotaImpostoPadrao !== undefined && { aliquotaImpostoPadrao }),
    },
    create: {
      id: "config_principal",
      fatorMultiplicador: fatorMultiplicador ?? 1.8,
      fatorGeracao: fatorGeracao ?? 136,
      percentualComissaoVenda: percentualComissaoVenda ?? 0.025,
      volumeMinimoComissao: volumeMinimoComissao ?? 60000,
      custoPlacaInstalacao: custoPlacaInstalacao ?? 70,
      custoInversorInstalacao: custoInversorInstalacao ?? 250,
      custoVisitaTecnicaPadrao: custoVisitaTecnicaPadrao ?? 120,
      custoCosernPadrao: custoCosernPadrao ?? 70,
      custoTrtCreaPadrao: custoTrtCreaPadrao ?? 65,
      custoEngenheiroPadrao: custoEngenheiroPadrao ?? 400,
      custoMaterialCAPadrao: custoMaterialCAPadrao ?? 500,
      aliquotaImpostoPadrao: aliquotaImpostoPadrao ?? 0.06,
    },
  });

  return NextResponse.json(config);
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * POST /api/admin/sync-totais
 *
 * Varre todas as vendas e força a invariante:
 *   comissaoTotal = comissaoVenda + comissaoOver
 *   comissaoVendedorCusto = comissaoTotal
 *   lucroLiquido = valorVenda - custoEquipamentos - outrosCustos - comissaoTotal
 *   margemLucroLiquido = lucroLiquido / valorVenda
 *
 * Body opcional: { dryRun?: boolean, vendedorId?: string, mesReferencia?: string }
 *  - dryRun: true → não escreve no banco, só retorna diff
 *  - vendedorId / mesReferencia: filtros pra restringir o sweep
 *
 * Retorna lista de vendas que foram (ou seriam) corrigidas.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const where: any = {};
  if (body?.vendedorId) where.vendedorId = body.vendedorId;
  if (body?.mesReferencia) where.mesReferencia = body.mesReferencia;

  const vendas = await prisma.venda.findMany({
    where,
    include: { vendedor: { select: { nome: true } } },
  });

  const EPSILON = 0.01;
  const corrigidas: Array<{
    id: string;
    cliente: string;
    vendedor: string | null;
    mesReferencia: string;
    comissaoVenda: number;
    comissaoOver: number;
    comissaoTotalAntes: number;
    comissaoTotalDepois: number;
    diff: number;
    lucroLiquidoAntes: number | null;
    lucroLiquidoDepois: number;
  }> = [];

  for (const v of vendas) {
    const novaComissaoTotal = (v.comissaoVenda ?? 0) + (v.comissaoOver ?? 0);
    const diff = novaComissaoTotal - (v.comissaoTotal ?? 0);

    const outrosCustos =
      (v.custoInstalacao ?? 0) +
      (v.custoVisitaTecnica ?? 0) +
      (v.custoCosern ?? 0) +
      (v.custoTrtCrea ?? 0) +
      (v.custoEngenheiro ?? 0) +
      (v.custoMaterialCA ?? 0) +
      (v.custoImposto ?? 0);
    const novoLucro =
      v.valorVenda - v.custoEquipamentos - outrosCustos - novaComissaoTotal;
    const novaMargemLucro = v.valorVenda > 0 ? novoLucro / v.valorVenda : 0;

    if (Math.abs(diff) < EPSILON) continue;

    corrigidas.push({
      id: v.id,
      cliente: v.cliente,
      vendedor: v.vendedor?.nome ?? null,
      mesReferencia: v.mesReferencia,
      comissaoVenda: v.comissaoVenda,
      comissaoOver: v.comissaoOver,
      comissaoTotalAntes: v.comissaoTotal,
      comissaoTotalDepois: novaComissaoTotal,
      diff,
      lucroLiquidoAntes: v.lucroLiquido,
      lucroLiquidoDepois: novoLucro,
    });

    if (!dryRun) {
      await prisma.venda.update({
        where: { id: v.id },
        data: {
          comissaoTotal: novaComissaoTotal,
          comissaoVendedorCusto: novaComissaoTotal,
          lucroLiquido: novoLucro,
          margemLucroLiquido: novaMargemLucro,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    totalVendas: vendas.length,
    totalCorrigidas: corrigidas.length,
    somaDiff: corrigidas.reduce((s, c) => s + c.diff, 0),
    corrigidas,
  });
}

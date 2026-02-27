import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * POST /api/admin/ajustar-vendas
 *
 * Ajusta margem e comissaoOver de vendas específicas pelo nome do cliente.
 *
 * Body: {
 *   ajustes: [
 *     { cliente: "MARIA DO CEU DE LIMA", margem: 1.65, comissaoOver: 400 },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { ajustes } = body as {
    ajustes: { cliente: string; margem?: number; comissaoOver?: number }[];
  };

  if (!ajustes?.length) {
    return NextResponse.json({ error: "Nenhum ajuste informado" }, { status: 400 });
  }

  const resultados = [];

  for (const ajuste of ajustes) {
    const venda = await prisma.venda.findFirst({
      where: { cliente: { contains: ajuste.cliente, mode: "insensitive" } },
    });

    if (!venda) {
      resultados.push({ cliente: ajuste.cliente, status: "NAO_ENCONTRADA" });
      continue;
    }

    const updateData: any = {};

    // Atualizar margem e recalcular custos
    if (ajuste.margem !== undefined) {
      const novoCustoEquipamentos = venda.valorVenda / ajuste.margem;
      const aliquota = venda.aliquotaImposto ?? 0.06;
      const novoCustoImposto = Math.max(venda.valorVenda - novoCustoEquipamentos, 0) * aliquota;

      updateData.margem = ajuste.margem;
      updateData.custoEquipamentos = novoCustoEquipamentos;
      updateData.custoImposto = novoCustoImposto;
    }

    // Atualizar comissaoOver e recalcular comissaoTotal
    if (ajuste.comissaoOver !== undefined) {
      updateData.comissaoOver = ajuste.comissaoOver;
      updateData.comissaoTotal = venda.comissaoVenda + ajuste.comissaoOver;
      updateData.comissaoVendedorCusto = venda.comissaoVenda + ajuste.comissaoOver;
    }

    // Recalcular lucro líquido com todos os valores atualizados
    const custoEquip = updateData.custoEquipamentos ?? venda.custoEquipamentos;
    const custoImposto = updateData.custoImposto ?? venda.custoImposto;
    const comissaoTotal = updateData.comissaoTotal ?? venda.comissaoTotal;
    const outrosCustos =
      (venda.custoInstalacao ?? 0) +
      (venda.custoVisitaTecnica ?? 0) +
      (venda.custoCosern ?? 0) +
      (venda.custoTrtCrea ?? 0) +
      (venda.custoEngenheiro ?? 0) +
      (venda.custoMaterialCA ?? 0);

    const novoLucro = venda.valorVenda - custoEquip - custoImposto - outrosCustos - comissaoTotal;
    const novaMargemLucro = venda.valorVenda > 0 ? novoLucro / venda.valorVenda : 0;

    updateData.lucroLiquido = novoLucro;
    updateData.margemLucroLiquido = novaMargemLucro;

    await prisma.venda.update({
      where: { id: venda.id },
      data: updateData,
    });

    resultados.push({
      cliente: venda.cliente,
      status: "ATUALIZADA",
      margem: updateData.margem ?? venda.margem,
      comissaoOver: updateData.comissaoOver ?? venda.comissaoOver,
      lucroLiquido: novoLucro,
    });
  }

  return NextResponse.json({ ok: true, resultados });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

// PUT - Aprovar ou rejeitar solicitação de margem
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { acao, observacao } = await request.json(); // acao: "APROVAR" | "REJEITAR"

  const solicitacao = await prisma.solicitacaoMargem.findUnique({
    where: { id: params.id },
    include: { venda: true },
  });

  if (!solicitacao) {
    return NextResponse.json({ error: "Solicitacao nao encontrada" }, { status: 404 });
  }

  if (solicitacao.status !== "AGUARDANDO") {
    return NextResponse.json({ error: "Solicitacao ja processada" }, { status: 400 });
  }

  if (acao === "APROVAR") {
    const venda = solicitacao.venda;
    const aliquota = venda.aliquotaImposto ?? 0.06;
    const novoCustoImposto = Math.max(venda.valorVenda - solicitacao.novoCustoEquipamentos, 0) * aliquota;
    const comissaoUsada = venda.comissaoVendedorCusto ?? venda.comissaoTotal;
    const outrosCustos =
      (venda.custoInstalacao ?? 0) +
      (venda.custoVisitaTecnica ?? 0) +
      (venda.custoCosern ?? 0) +
      (venda.custoTrtCrea ?? 0) +
      (venda.custoEngenheiro ?? 0) +
      (venda.custoMaterialCA ?? 0);
    const novoLucro = venda.valorVenda - solicitacao.novoCustoEquipamentos - novoCustoImposto - outrosCustos - comissaoUsada;
    const novaMargemLucro = venda.valorVenda > 0 ? novoLucro / venda.valorVenda : 0;

    await prisma.$transaction([
      // Atualiza a venda com a nova margem
      prisma.venda.update({
        where: { id: solicitacao.vendaId },
        data: {
          margem: solicitacao.novaMargem,
          custoEquipamentos: solicitacao.novoCustoEquipamentos,
          custoImposto: novoCustoImposto,
          lucroLiquido: novoLucro,
          margemLucroLiquido: novaMargemLucro,
        },
      }),
      // Marca solicitação como aprovada
      prisma.solicitacaoMargem.update({
        where: { id: params.id },
        data: { status: "APROVADO", observacao: observacao ?? null },
      }),
    ]);
  } else if (acao === "REJEITAR") {
    await prisma.solicitacaoMargem.update({
      where: { id: params.id },
      data: { status: "REJEITADO", observacao: observacao ?? null },
    });
  } else {
    return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, acao });
}

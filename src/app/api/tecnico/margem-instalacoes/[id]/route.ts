import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";
import { classificarMargemInstalacao } from "@/lib/margem-instalacao";

// PUT — engenheiro lanca custo real da instalacao. Sistema reclassifica o
// statusMargemInstalacao automaticamente baseado no limite atual.
// Aceita observacao opcional (justificativa quando saiu do verde).
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { custoInstalacaoReal, observacaoMargemInstalacao } = await request.json();

  if (custoInstalacaoReal === undefined && observacaoMargemInstalacao === undefined) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const venda = await prisma.venda.findUnique({ where: { id: params.id } });
  if (!venda) return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });

  const data: any = {};
  if (custoInstalacaoReal !== undefined) {
    data.custoInstalacaoReal = parseFloat(custoInstalacaoReal);
    // Auto-classifica
    const config = await prisma.configuracao.findFirst();
    if (config) {
      data.statusMargemInstalacao = classificarMargemInstalacao(data.custoInstalacaoReal, {
        limiteCustoInstalacao: config.limiteCustoInstalacao,
        metragemCaboPadrao: config.metragemCaboPadrao,
        metragemCaboTolerada: config.metragemCaboTolerada,
      });
    }
  }
  if (observacaoMargemInstalacao !== undefined) {
    data.observacaoMargemInstalacao = observacaoMargemInstalacao?.trim() || null;
  }

  const updated = await prisma.venda.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      custoInstalacaoReal: true,
      statusMargemInstalacao: true,
      observacaoMargemInstalacao: true,
    },
  });

  return NextResponse.json(updated);
}

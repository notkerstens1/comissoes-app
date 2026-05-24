import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";

// GET — lista vendas com dados de instalacao, filtrado por periodo/cidade/status.
// Apenas vendas com metragemCaboPrevista preenchida (sao as que viraram custo
// estimado de instalacao). Pedro usa pra ver onde estourou.
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
  const cidade = searchParams.get("cidade");

  const where: any = {
    metragemCaboPrevista: { not: null },
  };

  if (startDate && endDate) {
    where.dataConversao = {
      gte: new Date(`${startDate}T00:00:00`),
      lte: new Date(`${endDate}T23:59:59.999`),
    };
  }
  if (status) where.statusMargemInstalacao = status;
  if (cidade) where.cidadeInstalacao = cidade;

  const vendas = await prisma.venda.findMany({
    where,
    select: {
      id: true,
      cliente: true,
      dataConversao: true,
      valorVenda: true,
      cidadeInstalacao: true,
      bitolaCabo: true,
      metragemCaboPrevista: true,
      inversorTrifasico: true,
      custoInstalacaoEstimado: true,
      custoInstalacaoReal: true,
      statusMargemInstalacao: true,
      observacaoMargemInstalacao: true,
      vendedor: { select: { nome: true } },
    },
    orderBy: { dataConversao: "desc" },
  });

  // Totais agregados pro header
  const totalEstimado = vendas.reduce((s, v) => s + (v.custoInstalacaoEstimado ?? 0), 0);
  const totalReal = vendas.reduce((s, v) => s + (v.custoInstalacaoReal ?? 0), 0);
  const concluidas = vendas.filter((v) => v.custoInstalacaoReal !== null).length;
  const verde = vendas.filter((v) => v.statusMargemInstalacao === "VERDE").length;
  const amarelo = vendas.filter((v) => v.statusMargemInstalacao === "AMARELO").length;
  const vermelho = vendas.filter((v) => v.statusMargemInstalacao === "VERMELHO").length;

  return NextResponse.json({
    vendas,
    resumo: {
      total: vendas.length,
      concluidas,
      verde,
      amarelo,
      vermelho,
      totalEstimado,
      totalReal,
      delta: totalReal - totalEstimado,
    },
  });
}

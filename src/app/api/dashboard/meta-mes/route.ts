import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES_VENDEDOR_TIME } from "@/lib/roles";
import { getMesAtual, getNomeMes } from "@/lib/dates";
import { buildMetaMes, somarMetasContratos } from "@/lib/meta-mes";

// GET - Placar de meta do mes corrente (todos os roles autenticados).
// Meta de contratos = soma das metas individuais dos vendedores ativos.
// Receita = projecao fixa da config (referencia). Realizado separado por
// statusContrato (efetivo x a finalizar).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const mes = getMesAtual();

  const [config, vendedores, vendas] = await Promise.all([
    prisma.configuracao.findFirst(),
    prisma.user.findMany({
      where: { role: { in: [...ROLES_VENDEDOR_TIME] }, ativo: true },
      select: { nome: true, metaVendasQtdMes: true },
      orderBy: { nome: "asc" },
    }),
    prisma.venda.findMany({
      where: { mesReferencia: mes },
      select: { valorVenda: true, statusContrato: true },
    }),
  ]);

  const metaContratos = somarMetasContratos(
    vendedores.map((v) => v.metaVendasQtdMes),
    config?.metaVendasQtdMes ?? 8,
  );

  const result = buildMetaMes(
    metaContratos,
    config?.receitaProjetadaMes ?? 500000,
    vendedores.length,
    vendas.map((v) => ({ valorVenda: v.valorVenda, statusContrato: v.statusContrato })),
  );

  return NextResponse.json({
    mes,
    mesLabel: getNomeMes(mes),
    vendedoresNomes: vendedores.map((v) => v.nome),
    ...result,
  });
}

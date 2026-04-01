import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isPosVenda } from "@/lib/roles";

const ETAPAS_ORDER = [
  "TRAMITES",
  "AGUARDANDO_MATERIAL",
  "VISITA_TECNICA",
  "AGUARDANDO_VISTORIA",
  "CADASTRAR_APP",
  "ACOMPANHAMENTO_30",
  "CLIENTE_FINALIZADO",
  "MANUTENCOES",
];

// GET /api/revenue/pos-venda — Dados da aba Pos-Venda
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Buscar pos-vendas ativas
  const where: any = { ativo: true };
  // POS_VENDA ve apenas seus registros, outros veem todos
  if (isPosVenda(role)) {
    where.operadorId = userId;
  }

  const posVendas = await prisma.posVenda.findMany({
    where,
    include: {
      operador: { select: { nome: true } },
      venda: { select: { valorVenda: true, cliente: true, dataConversao: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // KPIs por etapa
  const porEtapa: Record<string, number> = {};
  for (const etapa of ETAPAS_ORDER) {
    porEtapa[etapa] = 0;
  }
  for (const pv of posVendas) {
    porEtapa[pv.etapa] = (porEtapa[pv.etapa] || 0) + 1;
  }

  // Pipeline
  const pipeline = ETAPAS_ORDER.map((etapa) => ({
    etapa,
    quantidade: porEtapa[etapa] || 0,
  }));

  // Clientes com atraso (>15 dias sem avancar)
  const agora = new Date();
  const atrasados = posVendas
    .filter((pv) => {
      if (pv.etapa === "CLIENTE_FINALIZADO" || pv.etapa === "MANUTENCOES") return false;
      const lastUpdate = pv.updatedAt;
      const diffDays = Math.floor((agora.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 15;
    })
    .map((pv) => ({
      id: pv.id,
      cliente: pv.nomeCliente,
      etapa: pv.etapa,
      operador: pv.operador.nome,
      diasParado: Math.floor((agora.getTime() - pv.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      ultimoContato: pv.ultimoContato,
    }));

  // Taxa de conclusao mensal
  const mesAtual = agora.toISOString().slice(0, 7); // "YYYY-MM"
  const concluidos = posVendas.filter(
    (pv) => pv.etapa === "CLIENTE_FINALIZADO" && pv.updatedAt.toISOString().startsWith(mesAtual)
  ).length;

  const totalAtivos = posVendas.filter(
    (pv) => pv.etapa !== "CLIENTE_FINALIZADO" && pv.etapa !== "MANUTENCOES"
  ).length;

  return NextResponse.json({
    kpis: {
      totalAtivos,
      concluidos,
      emTramite: porEtapa["TRAMITES"] || 0,
      aguardandoMaterial: porEtapa["AGUARDANDO_MATERIAL"] || 0,
      emInstalacao: porEtapa["VISITA_TECNICA"] || 0,
      emVistoria: porEtapa["AGUARDANDO_VISTORIA"] || 0,
      taxaConclusao: totalAtivos + concluidos > 0
        ? Math.round((concluidos / (totalAtivos + concluidos)) * 100)
        : 0,
    },
    pipeline,
    atrasados,
    total: posVendas.length,
  });
}

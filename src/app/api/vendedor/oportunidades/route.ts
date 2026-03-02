import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVendedor, isAdmin } from "@/lib/roles";

// GET — oportunidades abertas (vendedor=proprias, admin=todas ou filtradas)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isVendedor(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const vendedorFiltro = searchParams.get("vendedor");
  const tab = searchParams.get("tab"); // "pipeline" (default) ou "descartados"
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = {};

  // Admin/diretor ve todas, ou filtradas por vendedor
  if (isAdmin(role)) {
    if (vendedorFiltro) {
      where.vendedoraId = vendedorFiltro;
    }
  } else {
    // Vendedor ve apenas suas proprias
    where.vendedoraId = session.user.id;
  }

  // Tab: pipeline ou descartados
  if (tab === "descartados") {
    where.statusLead = "FINALIZADO";
  } else {
    where.statusLead = { in: ["AGENDADO", "COMPARECEU"] };
  }

  // Filtro por data da reuniao
  if (startDate || endDate) {
    where.dataReuniao = {};
    if (startDate) where.dataReuniao.gte = startDate;
    if (endDate) where.dataReuniao.lte = endDate;
  }

  const registros = await prisma.registroSDR.findMany({
    where,
    include: {
      sdr: { select: { id: true, nome: true } },
      vendedora: { select: { id: true, nome: true } },
    },
    orderBy: [
      { dataFechamentoEsperado: "asc" },
      { dataReuniao: "asc" },
    ],
  });

  // Calcular resumo
  const totalForecast = registros.reduce((sum, r) => sum + (r.valorForecast ?? 0), 0);
  const totalPonderado = registros.reduce(
    (sum, r) => sum + (r.valorForecast ?? 0) * (r.probabilidade / 100),
    0
  );

  // Contar alertas (5+ dias no pipe) - apenas pipeline
  const hoje = new Date();
  const alertas5dias = tab !== "descartados"
    ? registros.filter((r) => {
        const dataReuniao = new Date(r.dataReuniao);
        const dias = Math.floor((hoje.getTime() - dataReuniao.getTime()) / (1000 * 60 * 60 * 24));
        return dias >= 5;
      }).length
    : 0;

  return NextResponse.json({ registros, totalForecast, totalPonderado, alertas5dias });
}

// PUT — atualizar campos de forecast ou descartar/reativar
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isVendedor(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    registroId,
    valorForecast,
    estagioOportunidade,
    probabilidade,
    dataFechamentoEsperado,
    // Descarte / Reativacao
    statusLead,
    motivoFinalizacao,
  } = body;

  if (!registroId) {
    return NextResponse.json({ error: "registroId obrigatorio" }, { status: 400 });
  }

  const registro = await prisma.registroSDR.findUnique({ where: { id: registroId } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
  if (!isAdmin(role) && registro.vendedoraId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const data: any = {};

  // Campos de forecast
  if (valorForecast !== undefined) data.valorForecast = Number(valorForecast);
  if (estagioOportunidade !== undefined) data.estagioOportunidade = estagioOportunidade;
  if (probabilidade !== undefined) data.probabilidade = Math.min(100, Math.max(0, Number(probabilidade)));
  if (dataFechamentoEsperado !== undefined) data.dataFechamentoEsperado = dataFechamentoEsperado || null;

  // Descarte
  if (statusLead === "FINALIZADO") {
    data.statusLead = "FINALIZADO";
    data.motivoFinalizacao = motivoFinalizacao || null;
  }
  // Reativacao
  if (statusLead === "COMPARECEU") {
    data.statusLead = "COMPARECEU";
    data.motivoFinalizacao = null;
  }

  const updated = await prisma.registroSDR.update({
    where: { id: registroId },
    data,
  });

  return NextResponse.json(updated);
}

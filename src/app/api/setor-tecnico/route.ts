import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";
import { gerarCodigoLocalizadorUnico } from "@/lib/codigo-localizador";

// GET — listar registros do setor tecnico (payload enxuto: sem campos JSON pesados)
// Campos pesados (anexos, comentarios, historicoAcoes) sao buscados sob demanda
// via GET /api/setor-tecnico/[id] quando o card e expandido.
//
// CRITICO pra performance: NAO selecionar anexos/comentarios aqui. Eles guardam
// PDFs/imagens em base64 (~110 MB somados em prod) e eram puxados inteiros do
// Postgres so pra contar quantos sao. O count agora e calculado no banco via
// json_array_length (so o inteiro cruza a rede), num segundo query barato.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const [registros, counts] = await Promise.all([
    prisma.setorTecnico.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nomeCliente: true,
        codigoLocalizador: true,
        telefone: true,
        email: true,
        vendedorNome: true,
        etapa: true,
        etapaInstalacao: true,
        dataVistoria: true,
        dataInstalacao: true,
        nomeInstalador: true,
        observacoes: true,
        ultimaAcao: true,
        proximaAcao: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        etiquetas: true,
        custoMaterialReal: true,
        statusMaterial: true,
        faixaInversorCA: true,
        venda: { select: { id: true, cliente: true, valorVenda: true, kwp: true, quantidadePlacas: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    // Counts calculados no Postgres — os blobs base64 nunca saem do banco.
    prisma.$queryRaw<{ id: string; anexosCount: bigint; comentariosCount: bigint }[]>`
      SELECT id,
             COALESCE(json_array_length(NULLIF("anexos", '')::json), 0)      AS "anexosCount",
             COALESCE(json_array_length(NULLIF("comentarios", '')::json), 0) AS "comentariosCount"
      FROM "SetorTecnico"
      WHERE ativo = true
    `,
  ]);

  const countsById = new Map(
    counts.map((c) => [c.id, { anexosCount: Number(c.anexosCount), comentariosCount: Number(c.comentariosCount) }]),
  );

  const slim = registros.map((r) => ({
    ...r,
    anexosCount: countsById.get(r.id)?.anexosCount ?? 0,
    comentariosCount: countsById.get(r.id)?.comentariosCount ?? 0,
  }));

  return NextResponse.json(slim);
}

// POST — criar novo registro no setor tecnico
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    nomeCliente, telefone, email, etapa, etapaInstalacao,
    observacoes, vendaId, vendedorNome,
  } = body;

  if (!nomeCliente) {
    return NextResponse.json({ error: "Nome do cliente obrigatorio" }, { status: 400 });
  }

  let codigoLocalizador: string | null = null;
  try { codigoLocalizador = await gerarCodigoLocalizadorUnico(prisma); } catch (e) { console.error("codigo localizador:", e); }

  const registro = await prisma.setorTecnico.create({
    data: {
      nomeCliente: nomeCliente.trim(),
      codigoLocalizador,
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      etapa: etapa || "NOVO_PROJETO",
      etapaInstalacao: etapaInstalacao || "AGENDAR_VISITA",
      observacoes: observacoes?.trim() || null,
      vendaId: vendaId || null,
      vendedorNome: vendedorNome?.trim() || null,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}

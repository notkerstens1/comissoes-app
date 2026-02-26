import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDiretor } from "@/lib/roles";

/**
 * POST /api/admin/reatribuir-sdr
 *
 * Reatribui registros SDR de um vendedor para outro pelo nome do cliente.
 *
 * Body: {
 *   clientes: ["JOSÉ ADRIANO DE SOUZA", "SUELIAN SILVA"],
 *   deVendedorNome: "Emelly Alves",
 *   paraVendedorNome: "Juliana ..."
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { clientes, deVendedorNome, paraVendedorNome } = body as {
    clientes: string[];
    deVendedorNome: string;
    paraVendedorNome: string;
  };

  if (!clientes?.length || !deVendedorNome || !paraVendedorNome) {
    return NextResponse.json(
      { error: "Campos obrigatórios: clientes, deVendedorNome, paraVendedorNome" },
      { status: 400 }
    );
  }

  // Encontrar vendedora de origem
  const deVendedor = await prisma.user.findFirst({
    where: { nome: { contains: deVendedorNome, mode: "insensitive" } },
    select: { id: true, nome: true, email: true },
  });

  if (!deVendedor) {
    return NextResponse.json({ error: `Vendedor "${deVendedorNome}" não encontrado` }, { status: 404 });
  }

  // Encontrar vendedora de destino
  const paraVendedor = await prisma.user.findFirst({
    where: { nome: { contains: paraVendedorNome, mode: "insensitive" } },
    select: { id: true, nome: true, email: true },
  });

  if (!paraVendedor) {
    return NextResponse.json({ error: `Vendedor "${paraVendedorNome}" não encontrado` }, { status: 404 });
  }

  const resultados = [];

  for (const nomeCliente of clientes) {
    const registros = await prisma.registroSDR.findMany({
      where: {
        nomeCliente: { contains: nomeCliente, mode: "insensitive" },
        vendedoraId: deVendedor.id,
      },
      select: { id: true, nomeCliente: true, dataReuniao: true, statusLead: true, vendaVinculadaId: true },
    });

    if (registros.length === 0) {
      resultados.push({ cliente: nomeCliente, status: "NAO_ENCONTRADO", registros: 0 });
      continue;
    }

    // Reatribuir para nova vendedora
    await prisma.registroSDR.updateMany({
      where: {
        id: { in: registros.map((r) => r.id) },
      },
      data: { vendedoraId: paraVendedor.id },
    });

    // Se há vendas vinculadas, reatribuir também
    const vendaIds = registros
      .filter((r) => r.vendaVinculadaId)
      .map((r) => r.vendaVinculadaId!);

    if (vendaIds.length > 0) {
      await prisma.venda.updateMany({
        where: { id: { in: vendaIds }, vendedorId: deVendedor.id },
        data: { vendedorId: paraVendedor.id },
      });
    }

    resultados.push({
      cliente: nomeCliente,
      status: "REATRIBUIDO",
      registros: registros.length,
      vendasMigradas: vendaIds.length,
    });
  }

  return NextResponse.json({
    ok: true,
    de: { nome: deVendedor.nome, email: deVendedor.email },
    para: { nome: paraVendedor.nome, email: paraVendedor.email },
    resultados,
  });
}

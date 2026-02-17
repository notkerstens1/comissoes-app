import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { normalizeClientName, JANELA_VINCULO_DIAS } from "@/lib/sdr";

// GET - Lista pendencias de vinculo com candidatos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const pendencias = await prisma.pendenciaVinculo.findMany({
    where: { status: "PENDENTE" },
    include: {
      venda: {
        include: { vendedor: { select: { id: true, nome: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Para cada pendencia, buscar candidatos SDR
  const resultado = await Promise.all(
    pendencias.map(async (p) => {
      const venda = p.venda;
      const nomeNormalizado = normalizeClientName(venda.cliente);
      const dataConversao = new Date(venda.dataConversao);
      const limiteInferior = new Date(dataConversao);
      limiteInferior.setDate(limiteInferior.getDate() - JANELA_VINCULO_DIAS);

      const candidatos = await prisma.registroSDR.findMany({
        where: {
          vendedoraId: venda.vendedorId,
          compareceu: true,
          vendaVinculadaId: null,
          dataReuniao: {
            gte: limiteInferior.toISOString().split("T")[0],
            lte: dataConversao.toISOString().split("T")[0],
          },
        },
        include: {
          sdr: { select: { nome: true } },
          vendedora: { select: { nome: true } },
        },
      });

      // Filtrar por nome normalizado
      const matches = candidatos.filter(
        (r) => normalizeClientName(r.nomeCliente) === nomeNormalizado
      );

      return {
        id: p.id,
        vendaId: p.vendaId,
        status: p.status,
        createdAt: p.createdAt,
        venda: {
          id: venda.id,
          cliente: venda.cliente,
          valorVenda: venda.valorVenda,
          dataConversao: venda.dataConversao,
          vendedor: venda.vendedor,
        },
        candidatos: matches.map((c) => ({
          id: c.id,
          nomeCliente: c.nomeCliente,
          dataReuniao: c.dataReuniao,
          sdr: c.sdr,
          vendedora: c.vendedora,
          comissaoReuniao: c.comissaoReuniao,
        })),
      };
    })
  );

  return NextResponse.json(resultado);
}

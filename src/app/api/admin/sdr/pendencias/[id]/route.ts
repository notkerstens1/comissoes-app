import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { COMISSAO_VENDA_SDR } from "@/lib/sdr";

// PUT - Resolver pendencia: vincular ou SEM_SDR
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const pendencia = await prisma.pendenciaVinculo.findUnique({
    where: { id: params.id },
    include: { venda: true },
  });

  if (!pendencia) {
    return NextResponse.json({ error: "Pendencia nao encontrada" }, { status: 404 });
  }

  if (pendencia.status !== "PENDENTE") {
    return NextResponse.json({ error: "Pendencia ja resolvida" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { registroEscolhidoId, acao } = body; // acao: "VINCULAR" | "SEM_SDR"

    const hoje = new Date().toISOString().split("T")[0];

    if (acao === "SEM_SDR") {
      // Marcar como SEM_SDR — sem vinculo
      await prisma.pendenciaVinculo.update({
        where: { id: params.id },
        data: {
          status: "SEM_SDR",
          resolvidoPorId: session.user.id,
          dataResolucao: hoje,
        },
      });

      return NextResponse.json({ ok: true, status: "SEM_SDR" });
    }

    if (acao === "VINCULAR" && registroEscolhidoId) {
      // Vincular ao registro SDR escolhido
      const registro = await prisma.registroSDR.findUnique({
        where: { id: registroEscolhidoId },
      });

      if (!registro) {
        return NextResponse.json({ error: "Registro SDR nao encontrado" }, { status: 404 });
      }

      if (registro.vendaVinculadaId) {
        return NextResponse.json({ error: "Registro ja vinculado a outra venda" }, { status: 400 });
      }

      const dataConversaoStr = new Date(pendencia.venda.dataConversao).toISOString().split("T")[0];

      // Atualizar registro SDR com vinculo + comissao
      await prisma.registroSDR.update({
        where: { id: registroEscolhidoId },
        data: {
          vendaVinculadaId: pendencia.vendaId,
          dataVendaVinculada: dataConversaoStr,
          comissaoVenda: COMISSAO_VENDA_SDR,
          comissaoTotal: registro.comissaoReuniao + COMISSAO_VENDA_SDR,
        },
      });

      // Resolver pendencia
      await prisma.pendenciaVinculo.update({
        where: { id: params.id },
        data: {
          status: "RESOLVIDO",
          registroEscolhidoId,
          resolvidoPorId: session.user.id,
          dataResolucao: hoje,
        },
      });

      return NextResponse.json({ ok: true, status: "RESOLVIDO" });
    }

    return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
  } catch (error: any) {
    console.error("Erro ao resolver pendencia:", error);
    return NextResponse.json({ error: "Erro: " + error.message }, { status: 500 });
  }
}

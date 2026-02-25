import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isSDR } from "@/lib/roles";
import { COMISSAO_REUNIAO } from "@/lib/sdr";

// GET - Buscar registro por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const registro = await prisma.registroSDR.findUnique({
    where: { id: params.id },
    include: {
      sdr: { select: { nome: true } },
      vendedora: { select: { nome: true } },
      vendaVinculada: { select: { id: true, cliente: true, valorVenda: true, dataConversao: true } },
    },
  });

  if (!registro) {
    return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
  }

  // SDR so pode ver seus proprios
  if (isSDR(session.user.role) && registro.sdrId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  return NextResponse.json(registro);
}

// PUT - Editar registro (com anti-manipulacao)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const registro = await prisma.registroSDR.findUnique({
    where: { id: params.id },
  });

  if (!registro) {
    return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
  }

  const admin = isAdmin(session.user.role);
  const sdr = isSDR(session.user.role);

  // Permissao: SDR so edita os proprios, Admin edita todos
  if (sdr && registro.sdrId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  if (!sdr && !admin) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const temVinculo = !!registro.vendaVinculadaId;

    // Anti-manipulacao: SDR com vinculo so pode editar consideracoes e imagemUrl
    if (sdr && temVinculo) {
      const updateData: any = { consideracoes: body.consideracoes?.trim() || null };
      if (body.imagemUrl !== undefined) updateData.imagemUrl = body.imagemUrl || null;
      const updated = await prisma.registroSDR.update({
        where: { id: params.id },
        data: updateData,
        include: {
          sdr: { select: { nome: true } },
          vendedora: { select: { nome: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // SDR sem vinculo OU Admin/Diretor: pode editar tudo
    const { nomeCliente, vendedoraId, dataReuniao, compareceu, motivoNaoCompareceu, consideracoes, statusLead, motivoFinalizacao, imagemUrl } = body;

    const data: any = {};

    if (nomeCliente !== undefined) data.nomeCliente = nomeCliente.trim();
    if (vendedoraId !== undefined) data.vendedoraId = vendedoraId;
    if (dataReuniao !== undefined) data.dataReuniao = dataReuniao;
    if (consideracoes !== undefined) data.consideracoes = consideracoes?.trim() || null;
    if (imagemUrl !== undefined) data.imagemUrl = imagemUrl || null;

    // Atualizar statusLead e motivoFinalizacao
    if (statusLead !== undefined) {
      data.statusLead = statusLead;
      if (statusLead === "FINALIZADO") {
        data.motivoFinalizacao = motivoFinalizacao || null;
      } else {
        data.motivoFinalizacao = null;
      }
    }
    if (statusLead === undefined && motivoFinalizacao !== undefined) {
      data.motivoFinalizacao = motivoFinalizacao || null;
    }

    if (compareceu !== undefined) {
      data.compareceu = !!compareceu;

      if (!compareceu && registro.compareceu) {
        // Mudou de compareceu → nao compareceu: zerar comissoes e desvincular
        data.comissaoReuniao = 0;
        data.comissaoVenda = 0;
        data.comissaoTotal = 0;
        data.vendaVinculadaId = null;
        data.dataVendaVinculada = null;
        data.motivoNaoCompareceu = motivoNaoCompareceu || null;
        // Volta para AGENDADO
        if (!data.statusLead) data.statusLead = "AGENDADO";
      } else if (compareceu && !registro.compareceu) {
        // Mudou de nao compareceu → compareceu: atribuir comissao reuniao
        data.comissaoReuniao = COMISSAO_REUNIAO;
        data.comissaoTotal = COMISSAO_REUNIAO + (registro.comissaoVenda || 0);
        data.motivoNaoCompareceu = null;
        // Avanca para COMPARECEU
        if (!data.statusLead) data.statusLead = "COMPARECEU";
      }
    }

    // Se nao mudou compareceu, atualiza motivo se enviado
    if (compareceu === undefined && motivoNaoCompareceu !== undefined) {
      data.motivoNaoCompareceu = motivoNaoCompareceu || null;
    }

    const updated = await prisma.registroSDR.update({
      where: { id: params.id },
      data,
      include: {
        sdr: { select: { nome: true } },
        vendedora: { select: { nome: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar registro SDR:", error);
    return NextResponse.json({ error: "Erro ao atualizar: " + error.message }, { status: 500 });
  }
}

// DELETE - Excluir registro (apenas se nao vinculado)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const registro = await prisma.registroSDR.findUnique({
    where: { id: params.id },
  });

  if (!registro) {
    return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
  }

  const admin = isAdmin(session.user.role);
  const sdr = isSDR(session.user.role);

  if (sdr && registro.sdrId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  if (!sdr && !admin) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  // Nao permitir excluir registro vinculado
  if (registro.vendaVinculadaId) {
    return NextResponse.json(
      { error: "Nao e possivel excluir registro vinculado a uma venda" },
      { status: 400 }
    );
  }

  await prisma.registroSDR.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

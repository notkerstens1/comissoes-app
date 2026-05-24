import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico } from "@/lib/roles";
import { etapaTecnicoParaPosVenda, getCategoriaEtapa } from "@/lib/setor-tecnico";

// GET — buscar registro completo (com campos pesados) sob demanda
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    include: {
      venda: { select: { id: true, cliente: true, valorVenda: true, kwp: true, quantidadePlacas: true } },
    },
  });

  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  return NextResponse.json(registro);
}

// PUT — atualizar registro do setor tecnico
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const body = await request.json();
  const {
    nomeCliente, telefone, email, etapa, observacoes, ultimaAcao, proximaAcao,
    anexos, comentarios,
    // Novos campos da fase instalacao
    visitaValidada, bloqueioStatus, checklistDocumentos,
    dataVisita, dataInstalacao, dataRedeLigada,
  } = body;

  // Defesa em profundidade: arrays JSON nao sao mais aceitos no PUT generico
  // pra eliminar a classe de bug "cliente envia array completo e clobera o que
  // outro usuario adicionou no meio". Use os endpoints dedicados:
  //   POST/DELETE /api/setor-tecnico/[id]/comentarios[/[comentarioId]]
  //   POST/DELETE /api/setor-tecnico/[id]/anexos
  if (anexos !== undefined || comentarios !== undefined) {
    return NextResponse.json(
      { error: "Use os endpoints dedicados /comentarios e /anexos para mutar arrays" },
      { status: 400 },
    );
  }

  const data: any = {};

  if (nomeCliente !== undefined) data.nomeCliente = nomeCliente.trim();
  if (telefone !== undefined) data.telefone = telefone?.trim() || null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (etapa !== undefined) data.etapa = etapa;
  if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null;
  if (ultimaAcao !== undefined) data.ultimaAcao = ultimaAcao?.trim() || null;
  if (visitaValidada !== undefined) data.visitaValidada = !!visitaValidada;
  if (bloqueioStatus !== undefined) data.bloqueioStatus = bloqueioStatus?.trim() || null;
  if (checklistDocumentos !== undefined) {
    // Aceita string JSON ou array — converte sempre para string
    data.checklistDocumentos = typeof checklistDocumentos === "string"
      ? checklistDocumentos
      : JSON.stringify(checklistDocumentos);
  }
  if (dataVisita !== undefined) data.dataVisita = dataVisita?.trim() || null;
  if (dataInstalacao !== undefined) data.dataInstalacao = dataInstalacao?.trim() || null;
  if (dataRedeLigada !== undefined) data.dataRedeLigada = dataRedeLigada?.trim() || null;

  // Historico de acoes: ao atualizar proximaAcao, salvar a anterior no historico
  if (proximaAcao !== undefined) {
    const acaoAnterior = registro.proximaAcao;
    if (acaoAnterior) {
      const hoje = new Date().toISOString().split("T")[0];
      const historicoAtual: { data: string; acao: string }[] = registro.historicoAcoes
        ? JSON.parse(registro.historicoAcoes)
        : [];
      historicoAtual.push({ data: hoje, acao: acaoAnterior });
      data.historicoAcoes = JSON.stringify(historicoAtual);
    }
    data.proximaAcao = proximaAcao?.trim() || null;
  }

  const updated = await prisma.setorTecnico.update({
    where: { id: params.id },
    data,
  });

  // Sync com PosVenda: quando etapa do setor tecnico avanca para fase INSTALACAO,
  // espelha a etapa correspondente no PosVenda associado (se houver). Yuri ve
  // o progresso sem precisar perguntar no grupo.
  if (etapa !== undefined && registro.vendaId) {
    const etapaPosVenda = etapaTecnicoParaPosVenda(etapa);
    if (etapaPosVenda) {
      const posVenda = await prisma.posVenda.findFirst({
        where: { vendaId: registro.vendaId, ativo: true },
        select: { id: true, etapa: true },
      });
      if (posVenda && posVenda.etapa !== etapaPosVenda) {
        await prisma.posVenda.update({
          where: { id: posVenda.id },
          data: {
            etapa: etapaPosVenda,
            ultimaAcao: `Etapa sincronizada do setor tecnico (${etapa})`,
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
}

// DELETE — arquivar (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  if (!canAccessTecnico(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  await prisma.setorTecnico.update({
    where: { id: params.id },
    data: { ativo: false },
  });

  return NextResponse.json({ ok: true });
}

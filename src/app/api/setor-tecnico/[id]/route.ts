import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTecnico, canEditVistoria, canEditInstalacao } from "@/lib/roles";

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
    nomeCliente, telefone, email,
    etapa, etapaInstalacao,
    observacoes, ultimaAcao, proximaAcao,
    anexos, comentarios,
    // Novos campos da fase instalacao
    visitaValidada, bloqueioStatus, checklistDocumentos,
    dataVisita, dataInstalacao, dataRedeLigada, dataVistoria,
    // Localizacao da instalacao (alimenta o Mapa de Usinas)
    cidadeInstalacao, enderecoInstalacao,
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
  if (etapaInstalacao !== undefined) data.etapaInstalacao = etapaInstalacao;
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
  // Data de instalacao: engenheiro (TECNICO) + Pos-Venda podem editar. FINANCEIRO nao.
  if (dataInstalacao !== undefined && canEditInstalacao(session.user.role)) {
    data.dataInstalacao = dataInstalacao?.trim() || null;
  }
  if (dataRedeLigada !== undefined) data.dataRedeLigada = dataRedeLigada?.trim() || null;
  // Cidade/endereco da instalacao: mesma permissao da data de instalacao (TECNICO + Pos-Venda)
  if (cidadeInstalacao !== undefined && canEditInstalacao(session.user.role)) {
    data.cidadeInstalacao = cidadeInstalacao?.trim() || null;
  }
  if (enderecoInstalacao !== undefined && canEditInstalacao(session.user.role)) {
    data.enderecoInstalacao = enderecoInstalacao?.trim() || null;
  }
  // Data de vistoria: edicao exclusiva do engenheiro (TECNICO) + ADMIN/DIRETOR
  if (dataVistoria !== undefined && canEditVistoria(session.user.role)) {
    data.dataVistoria = dataVistoria?.trim() || null;
  }

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

  // PosVenda e SetorTecnico sao cards independentes: o que o engenheiro faz no
  // trilho de instalacao NAO espelha mais a etapa no card do Yuri. O pos-venda
  // controla a propria etapa e acompanha cada processo individualmente.

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

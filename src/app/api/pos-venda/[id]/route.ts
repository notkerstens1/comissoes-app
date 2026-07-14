import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isPosVenda } from "@/lib/roles";
import { matchSetorTecnicoVinculado } from "@/lib/setor-tecnico-vinculo";
import { geocodeEndereco } from "@/lib/geocode";

// Acha o card do Setor Tecnico vinculado a um card de pos-venda (fonte de verdade
// do endereco da geradora). Prefere vendaId, cai no codigoLocalizador.
async function buscarSetorVinculado(vendaId: string | null, codigoLocalizador: string | null) {
  if (!vendaId && !codigoLocalizador) return null;
  const candidatos = await prisma.setorTecnico.findMany({
    where: {
      ativo: true,
      OR: [
        ...(vendaId ? [{ vendaId }] : []),
        ...(codigoLocalizador ? [{ codigoLocalizador }] : []),
      ],
    },
    select: { id: true, vendaId: true, codigoLocalizador: true, enderecoInstalacao: true, cidadeInstalacao: true },
  });
  return matchSetorTecnicoVinculado({ vendaId, codigoLocalizador }, candidatos);
}

// GET — buscar registro completo (com campos pesados) sob demanda
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.posVenda.findUnique({
    where: { id: params.id },
    include: {
      operador: { select: { id: true, nome: true } },
      venda: { select: { id: true, cliente: true, valorVenda: true } },
    },
  });

  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  // Anexa o endereco da geradora do card tecnico vinculado (fonte de verdade).
  const setor = await buscarSetorVinculado(registro.vendaId, registro.codigoLocalizador);
  return NextResponse.json({ ...registro, enderecoInstalacao: setor?.enderecoInstalacao ?? null });
}

// PUT — atualizar registro de pos venda
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.posVenda.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const body = await request.json();
  const {
    nomeCliente,
    telefone,
    etapa,
    ultimaAcao,
    proximaAcao,
    observacoes,
    ultimoContato,
    proximoContato,
    anexos,
    tarefas,
    anotacoes,
    previsaoMaterial,
    previsaoInstalacao,
    conferido,
    dataConferido,
    checklistSupervisao,
    prazoFinalizacao,
    // Endereco da geradora: NAO fica no card de pos-venda. E gravado no card do
    // Setor Tecnico vinculado (fonte de verdade unica), abaixo.
    enderecoInstalacao,
  } = body;

  const data: any = {};
  if (nomeCliente !== undefined) data.nomeCliente = nomeCliente.trim();
  if (telefone !== undefined) data.telefone = telefone?.trim() || null;
  if (etapa !== undefined) data.etapa = etapa;
  if (ultimaAcao !== undefined) data.ultimaAcao = ultimaAcao?.trim() || null;
  if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null;
  if (ultimoContato !== undefined) data.ultimoContato = ultimoContato || null;
  if (proximoContato !== undefined) data.proximoContato = proximoContato || null;
  if (anexos !== undefined) data.anexos = anexos;
  if (tarefas !== undefined) data.tarefas = tarefas;
  if (anotacoes !== undefined) data.anotacoes = anotacoes?.trim() || null;
  if (previsaoMaterial !== undefined) data.previsaoMaterial = previsaoMaterial || null;
  if (previsaoInstalacao !== undefined) data.previsaoInstalacao = previsaoInstalacao || null;
  if (conferido !== undefined) data.conferido = conferido;
  if (dataConferido !== undefined) data.dataConferido = dataConferido || null;
  if (checklistSupervisao !== undefined) data.checklistSupervisao = checklistSupervisao;
  if (prazoFinalizacao !== undefined) data.prazoFinalizacao = prazoFinalizacao || null;

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

  // Endereco da geradora: fonte de verdade e o card do Setor Tecnico vinculado.
  // Resolve o vinculo ANTES de qualquer escrita: se o usuario mandou um endereco
  // mas nao ha card tecnico vinculado (cards legados sem vendaId/codigo), devolve
  // erro claro em vez de salvar em silencio — nao ha onde persistir.
  const setor = await buscarSetorVinculado(registro.vendaId, registro.codigoLocalizador);
  const enderecoTrim =
    enderecoInstalacao !== undefined ? enderecoInstalacao?.trim() || null : undefined;
  if (enderecoTrim && !setor) {
    return NextResponse.json(
      { error: "Este card não tem card de Engenharia vinculado, então o endereço não pode ser salvo por aqui." },
      { status: 409 },
    );
  }

  const updated = await prisma.posVenda.update({
    where: { id: params.id },
    data,
    include: {
      operador: { select: { id: true, nome: true } },
    },
  });

  // Grava o endereco no card tecnico vinculado e geocodifica pro Mapa de Usinas,
  // exatamente como o lado do tecnico faz. Sem duplicar a digitacao.
  let enderecoSalvo: string | null = setor?.enderecoInstalacao ?? null;
  if (enderecoTrim !== undefined && setor) {
    const dataSetor: any = { enderecoInstalacao: enderecoTrim };
    if (enderecoTrim) {
      const geo = await geocodeEndereco(enderecoTrim, setor.cidadeInstalacao);
      if (geo) {
        dataSetor.latitude = geo.lat;
        dataSetor.longitude = geo.lon;
        if (!setor.cidadeInstalacao && geo.cidade) dataSetor.cidadeInstalacao = geo.cidade;
      }
    } else {
      dataSetor.latitude = null;
      dataSetor.longitude = null;
    }
    await prisma.setorTecnico.update({ where: { id: setor.id }, data: dataSetor });
    enderecoSalvo = enderecoTrim;
  }

  return NextResponse.json({ ...updated, enderecoInstalacao: enderecoSalvo });
}

// DELETE — arquivar (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const role = session.user.role;
  if (!isPosVenda(role) && !isAdmin(role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
  }

  const registro = await prisma.posVenda.findUnique({ where: { id: params.id } });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  await prisma.posVenda.update({
    where: { id: params.id },
    data: { ativo: false },
  });

  return NextResponse.json({ ok: true });
}

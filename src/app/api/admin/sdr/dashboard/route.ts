import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

/**
 * GET /api/admin/sdr/dashboard
 *
 * Query params:
 *   tipo = "dia" | "semana" | "mes"  (default: "mes")
 *   data = "YYYY-MM-DD"              (para tipo=dia)
 *   semana = "YYYY-MM-DD"            (domingo da semana, para tipo=semana)
 *   mes = "YYYY-MM"                  (para tipo=mes)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? "mes";
  const data = searchParams.get("data");
  const semana = searchParams.get("semana");
  const mes = searchParams.get("mes");

  const where: any = {};

  // Filtrar por dataReuniao (data da reuniao) em vez de dataRegistro (data de cadastro)
  // Isso garante que dia/semana/mes mostrem dados diferentes baseados nas reunioes reais
  if (tipo === "dia" && data) {
    where.dataReuniao = data;
  } else if (tipo === "semana" && semana) {
    // semana = domingo (ex: "2026-02-23")
    const [y, m, d] = semana.split("-").map(Number);
    const domingo = new Date(y, m - 1, d);
    const sabado = new Date(y, m - 1, d + 6);
    const domingoStr = domingo.toISOString().split("T")[0];
    const sabadoStr = sabado.toISOString().split("T")[0];
    where.dataReuniao = { gte: domingoStr, lte: sabadoStr };
  } else {
    // mes (default)
    const mesVal = mes ?? new Date().toISOString().slice(0, 7);
    where.dataReuniao = { startsWith: mesVal };
  }

  const registros = await prisma.registroSDR.findMany({
    where,
    include: {
      vendedora: { select: { id: true, nome: true } },
      sdr: { select: { id: true, nome: true } },
      vendaVinculada: { select: { id: true, cliente: true, valorVenda: true } },
    },
    orderBy: { dataReuniao: "desc" },
  });

  // ── Buscar ligacoes reais do modelo LigacoesSDR ─────────────────────────────
  const whereLigacoes: any = {};
  if (tipo === "dia" && data) {
    whereLigacoes.data = data;
  } else if (tipo === "semana" && semana) {
    const [y, m, d] = semana.split("-").map(Number);
    const domingo = new Date(y, m - 1, d);
    const sabado = new Date(y, m - 1, d + 6);
    whereLigacoes.data = { gte: domingo.toISOString().split("T")[0], lte: sabado.toISOString().split("T")[0] };
  } else {
    const mesVal = mes ?? new Date().toISOString().slice(0, 7);
    whereLigacoes.data = { startsWith: mesVal };
  }

  const ligacoesRecords = await prisma.ligacoesSDR.findMany({ where: whereLigacoes });
  const totalLigacoesReal = ligacoesRecords.reduce((acc, l) => acc + l.quantidade, 0);

  // ── Totais auto-calculados ────────────────────────────────────────────────────
  const autoLigacoes = totalLigacoesReal;
  const autoReunioes = registros.filter((r) => r.compareceu).length;
  const autoReunioesAgendadas = registros.filter((r) => r.statusLead === "AGENDADO").length;
  const autoCpfNegado = registros.filter((r) => r.motivoFinalizacao === "CPF negada").length;
  const autoNoShow = registros.filter((r) => !r.compareceu && r.motivoNaoCompareceu).length;
  const autoDesqualificados = registros.filter((r) => r.statusLead === "FINALIZADO").length;

  // ── Buscar override manual do supervisor ────────────────────────────────────
  // periodoKey usado pelo frontend para salvar edições
  let periodoKey: string;
  if (tipo === "dia" && data) {
    periodoKey = `dia:${data}`;
  } else if (tipo === "semana" && semana) {
    periodoKey = `semana:${semana}`;
  } else {
    const mesVal = mes ?? new Date().toISOString().slice(0, 7);
    periodoKey = `mes:${mesVal}`;
  }

  let totalLigacoes = autoLigacoes;
  let totalReunioesAgendadas = autoReunioesAgendadas;
  let totalCpfNegado = autoCpfNegado;
  let totalNoShow = autoNoShow;
  let totalDesqualificados = autoDesqualificados;
  let override: {
    ligacoes: number | null;
    reunioesAgendadas: number | null;
    cpfNegado: number | null;
    desqualificados: number | null;
    noShow: number | null;
  } | null = null;

  if (tipo === "dia") {
    // Para dia: buscar override direto da chave dia:YYYY-MM-DD
    const ov = await prisma.metricasSDROverride.findUnique({ where: { periodo: periodoKey } });
    if (ov) {
      override = { ligacoes: ov.ligacoes, reunioesAgendadas: ov.reunioesAgendadas, cpfNegado: ov.cpfNegado, desqualificados: ov.desqualificados, noShow: ov.noShow };
      totalLigacoes = ov.ligacoes ?? autoLigacoes;
      totalReunioesAgendadas = ov.reunioesAgendadas ?? autoReunioesAgendadas;
      totalCpfNegado = ov.cpfNegado ?? autoCpfNegado;
      totalNoShow = ov.noShow ?? autoNoShow;
      totalDesqualificados = ov.desqualificados ?? autoDesqualificados;
    }
  } else {
    // Para semana/mes: agregar overrides de dia dentro do range
    if (tipo === "semana" && semana) {
      const [y, m, d] = semana.split("-").map(Number);
      const dom = new Date(y, m - 1, d);
      const sab = new Date(y, m - 1, d + 6);
      const domStr = dom.toISOString().split("T")[0];
      const sabStr = sab.toISOString().split("T")[0];
      // Buscar dia:YYYY-MM-DD dentro do range
      const dayOverrides = await prisma.metricasSDROverride.findMany({
        where: { periodo: { gte: `dia:${domStr}`, lte: `dia:${sabStr}` } },
      });

      // Para cada dia com override, calcular o delta vs auto-calculado daquele dia
      for (const ov of dayOverrides) {
        const diaStr = ov.periodo.replace("dia:", "");
        const regsOfDay = registros.filter((r) => r.dataReuniao === diaStr);
        const ligOfDay = ligacoesRecords.filter((l) => l.data === diaStr);

        const autoLigDay = ligOfDay.reduce((s, l) => s + l.quantidade, 0);
        const autoAgendDay = regsOfDay.filter((r) => r.statusLead === "AGENDADO").length;
        const autoCpfDay = regsOfDay.filter((r) => r.motivoFinalizacao === "CPF negada").length;
        const autoNoShowDay = regsOfDay.filter((r) => !r.compareceu && r.motivoNaoCompareceu).length;
        const autoDesqDay = regsOfDay.filter((r) => r.statusLead === "FINALIZADO").length;

        if (ov.ligacoes != null) totalLigacoes += (ov.ligacoes - autoLigDay);
        if (ov.reunioesAgendadas != null) totalReunioesAgendadas += (ov.reunioesAgendadas - autoAgendDay);
        if (ov.cpfNegado != null) totalCpfNegado += (ov.cpfNegado - autoCpfDay);
        if (ov.noShow != null) totalNoShow += (ov.noShow - autoNoShowDay);
        if (ov.desqualificados != null) totalDesqualificados += (ov.desqualificados - autoDesqDay);
      }
    } else {
      // mes
      const mesVal = mes ?? new Date().toISOString().slice(0, 7);
      const dayOverrides = await prisma.metricasSDROverride.findMany({
        where: { periodo: { startsWith: `dia:${mesVal}` } },
      });

      for (const ov of dayOverrides) {
        const diaStr = ov.periodo.replace("dia:", "");
        const regsOfDay = registros.filter((r) => r.dataReuniao === diaStr);
        const ligOfDay = ligacoesRecords.filter((l) => l.data === diaStr);

        const autoLigDay = ligOfDay.reduce((s, l) => s + l.quantidade, 0);
        const autoAgendDay = regsOfDay.filter((r) => r.statusLead === "AGENDADO").length;
        const autoCpfDay = regsOfDay.filter((r) => r.motivoFinalizacao === "CPF negada").length;
        const autoNoShowDay = regsOfDay.filter((r) => !r.compareceu && r.motivoNaoCompareceu).length;
        const autoDesqDay = regsOfDay.filter((r) => r.statusLead === "FINALIZADO").length;

        if (ov.ligacoes != null) totalLigacoes += (ov.ligacoes - autoLigDay);
        if (ov.reunioesAgendadas != null) totalReunioesAgendadas += (ov.reunioesAgendadas - autoAgendDay);
        if (ov.cpfNegado != null) totalCpfNegado += (ov.cpfNegado - autoCpfDay);
        if (ov.noShow != null) totalNoShow += (ov.noShow - autoNoShowDay);
        if (ov.desqualificados != null) totalDesqualificados += (ov.desqualificados - autoDesqDay);
      }
    }
  }

  // Garantir que não fique negativo
  totalLigacoes = Math.max(0, totalLigacoes);
  totalReunioesAgendadas = Math.max(0, totalReunioesAgendadas);
  totalCpfNegado = Math.max(0, totalCpfNegado);
  totalNoShow = Math.max(0, totalNoShow);
  totalDesqualificados = Math.max(0, totalDesqualificados);

  const totalReunioes = autoReunioes;

  // ── Ligações por dia (do modelo LigacoesSDR) ──────────────────────────────────
  const ligacoesPorDiaMap: Record<string, number> = {};
  ligacoesRecords.forEach((l) => {
    ligacoesPorDiaMap[l.data] = (ligacoesPorDiaMap[l.data] || 0) + l.quantidade;
  });
  const ligacoesPorDia = Object.entries(ligacoesPorDiaMap)
    .map(([dataStr, count]) => ({ data: dataStr, count }))
    .sort((a, b) => a.data.localeCompare(b.data));

  // ── Motivos de não comparecimento ─────────────────────────────────────────────
  const motivosNcMap: Record<string, number> = {};
  registros
    .filter((r) => r.motivoNaoCompareceu)
    .forEach((r) => {
      const m = r.motivoNaoCompareceu!;
      motivosNcMap[m] = (motivosNcMap[m] || 0) + 1;
    });
  const motivosNaoCompareceu = Object.entries(motivosNcMap)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count);

  // ── Motivos de finalização ────────────────────────────────────────────────────
  const finalizacaoMap: Record<string, number> = {};
  registros
    .filter((r) => r.motivoFinalizacao)
    .forEach((r) => {
      const m = r.motivoFinalizacao!;
      finalizacaoMap[m] = (finalizacaoMap[m] || 0) + 1;
    });
  const motivosFinalizacao = Object.entries(finalizacaoMap)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count);

  // ── Por vendedor ──────────────────────────────────────────────────────────────
  const vendedoresMap: Record<string, { id: string; nome: string; itens: typeof registros }> = {};
  registros.forEach((r) => {
    const vid = r.vendedoraId;
    if (!vendedoresMap[vid]) {
      vendedoresMap[vid] = { id: vid, nome: r.vendedora.nome, itens: [] };
    }
    vendedoresMap[vid].itens.push(r);
  });

  const porVendedor = Object.values(vendedoresMap)
    .map((v) => ({
      id: v.id,
      nome: v.nome,
      totalOportunidades: v.itens.length,
      reunioesFeitas: v.itens.filter((r) => r.compareceu).length,
      cpfNegado: v.itens.filter((r) => r.motivoFinalizacao === "CPF negada").length,
      desqualificados: v.itens.filter((r) => r.statusLead === "FINALIZADO").length,
      vendas: v.itens.filter((r) => r.vendaVinculadaId).length,
      registros: v.itens.map((r) => ({
        id: r.id,
        nomeCliente: r.nomeCliente,
        dataReuniao: r.dataReuniao,
        compareceu: r.compareceu,
        motivoNaoCompareceu: r.motivoNaoCompareceu,
        motivoFinalizacao: r.motivoFinalizacao,
        statusLead: r.statusLead,
        sdrNome: r.sdr?.nome ?? null,
        vendaVinculada: r.vendaVinculada
          ? { cliente: r.vendaVinculada.cliente, valorVenda: r.vendaVinculada.valorVenda }
          : null,
      })),
    }))
    .sort((a, b) => b.totalOportunidades - a.totalOportunidades);

  return NextResponse.json({
    totalLigacoes,
    totalReunioes,
    totalReunioesAgendadas,
    totalCpfNegado,
    totalNoShow,
    totalDesqualificados,
    periodoKey,
    override: override ? {
      ligacoes: override.ligacoes,
      reunioesAgendadas: override.reunioesAgendadas,
      cpfNegado: override.cpfNegado,
      desqualificados: override.desqualificados,
      noShow: override.noShow,
    } : null,
    ligacoesPorDia,
    motivosNaoCompareceu,
    motivosFinalizacao,
    porVendedor,
  });
}

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Verificar se já existem usuários reais (@gmail.com) no sistema
  // Se sim, não recriar os usuários seed @solar.com (ambiente de produção)
  const gmailUsersCount = await prisma.user.count({
    where: { email: { endsWith: "@gmail.com" } },
  });
  const isProducao = gmailUsersCount > 0;

  if (isProducao) {
    console.log(`[SEED] ${gmailUsersCount} usuarios @gmail.com encontrados — ambiente de producao detectado.`);
    console.log("[SEED] Pulando criacao de usuarios @solar.com (exceto daniel@solar.com).");
  }

  // ── Supervisor ────────────────────────────────────────────────────────────────
  let supervisor: { id: string; nome: string; email: string } | null = null;
  if (!isProducao) {
    const senhaSupervisor = await hash("supervisor123", 12);
    supervisor = await prisma.user.upsert({
      where: { email: "supervisor@solar.com" },
      update: { nome: "Eric Lima" },
      create: { nome: "Eric Lima", email: "supervisor@solar.com", senha: senhaSupervisor, role: "ADMIN" },
    });
    console.log("Supervisor criado:", supervisor.email);
  } else {
    supervisor = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  }

  // ── Diretor ───────────────────────────────────────────────────────────────────
  let diretor: { id: string; nome: string; email: string } | null = null;
  if (!isProducao) {
    const senhaDiretor = await hash("diretor123", 12);
    diretor = await prisma.user.upsert({
      where: { email: "diretor@solar.com" },
      update: { nome: "Erick Santos" },
      create: { nome: "Erick Santos", email: "diretor@solar.com", senha: senhaDiretor, role: "DIRETOR" },
    });
    console.log("Diretor criado:", diretor.email);
  } else {
    diretor = await prisma.user.findFirst({ where: { role: "DIRETOR" } });
  }

  const senhaVendedor = await hash("vendedor123", 12);

  // ── Bruna ─────────────────────────────────────────────────────────────────────
  let bruna: { id: string; nome: string; email: string } | null = null;
  if (!isProducao) {
    bruna = await prisma.user.upsert({
      where: { email: "bruna@solar.com" },
      update: { nome: "Bruna", ativo: true },
      create: { nome: "Bruna", email: "bruna@solar.com", senha: senhaVendedor, role: "VENDEDOR" },
    });
    console.log("Vendedor criado:", bruna.email);
  } else {
    bruna = await prisma.user.findFirst({ where: { nome: { startsWith: "Bruna" }, email: { endsWith: "@gmail.com" } } });
  }

  // ── Juliana ───────────────────────────────────────────────────────────────────
  let juliana: { id: string; nome: string; email: string } | null = null;
  if (!isProducao) {
    // Desativar emails antigos/errados apenas em dev
    await prisma.user.updateMany({
      where: { email: { in: ["juliana@solar.com", "erick@solar.com", "ana@solar.com"] } },
      data: { ativo: false },
    });
    await prisma.user.updateMany({
      where: { email: "juliana@solar.com" },
      data: { ativo: true },
    });
    juliana = await prisma.user.upsert({
      where: { email: "juliana@solar.com" },
      update: { nome: "Juliana", email: "juliana@solar.com", ativo: true },
      create: { nome: "Juliana", email: "juliana@solar.com", senha: senhaVendedor, role: "VENDEDOR" },
    });
    console.log("Vendedor criado:", juliana.email);
  } else {
    juliana = await prisma.user.findFirst({ where: { nome: { startsWith: "Juliana" }, email: { endsWith: "@gmail.com" } } });
  }

  // ── Daniel (sempre mantido) ───────────────────────────────────────────────────
  const daniel = await prisma.user.upsert({
    where: { email: "daniel@solar.com" },
    update: { nome: "Daniel", ativo: true },
    create: { nome: "Daniel", email: "daniel@solar.com", senha: senhaVendedor, role: "VENDEDOR_EXTERNO" },
  });
  console.log("Vendedor Externo criado/mantido:", daniel.email);

  // ── Yuri (Pós Venda) ──────────────────────────────────────────────────────────
  let yuri: { id: string; nome: string; email: string } | null = null;
  if (!isProducao) {
    const senhaPosVenda = await hash("posvenda123", 12);
    yuri = await prisma.user.upsert({
      where: { email: "yuri@solar.com" },
      update: { nome: "Yuri", ativo: true },
      create: { nome: "Yuri", email: "yuri@solar.com", senha: senhaPosVenda, role: "POS_VENDA" },
    });
    console.log("Pos Venda criado:", yuri.email);
  } else {
    yuri = await prisma.user.findFirst({ where: { role: "POS_VENDA" } });
  }

  // ── Emelly (SDR) ──────────────────────────────────────────────────────────────
  let emelly: { id: string; nome: string; email: string } | null = null;
  if (!isProducao) {
    const senhaSDR = await hash("sdr123", 12);
    emelly = await prisma.user.upsert({
      where: { email: "emelly@solar.com" },
      update: { nome: "Emelly", ativo: true },
      create: { nome: "Emelly", email: "emelly@solar.com", senha: senhaSDR, role: "SDR" },
    });
    console.log("SDR criada:", emelly.email);
  } else {
    emelly = await prisma.user.findFirst({ where: { role: "SDR" } });
  }

  // Compat: se não achou nenhum usuário de destino para vendas seed, usa null seguro
  if (!juliana || !daniel || !emelly || !yuri) {
    console.log("[SEED] Alguns usuarios de referencia nao encontrados — pulando criacao de vendas/SDR/PosVenda seed.");
  }

  // Criar configuracao (com novos campos de custos)
  await prisma.configuracao.upsert({
    where: { id: "config_principal" },
    update: {
      fatorMultiplicador: 1.8,
      custoPlacaInstalacao: 70,
      custoInversorInstalacao: 250,
      custoVisitaTecnicaPadrao: 120,
      custoCosernPadrao: 70,
      custoTrtCreaPadrao: 65,
      custoEngenheiroPadrao: 400,
      custoMaterialCAPadrao: 500,
      aliquotaImpostoPadrao: 0.06,
    },
    create: {
      id: "config_principal",
      fatorMultiplicador: 1.8,
      fatorGeracao: 136,
      percentualComissaoVenda: 0.025,
      volumeMinimoComissao: 60000,
      custoPlacaInstalacao: 70,
      custoInversorInstalacao: 250,
      custoVisitaTecnicaPadrao: 120,
      custoCosernPadrao: 70,
      custoTrtCreaPadrao: 65,
      custoEngenheiroPadrao: 400,
      custoMaterialCAPadrao: 500,
      aliquotaImpostoPadrao: 0.06,
    },
  });
  console.log("Configuracao criada/atualizada");

  // Criar faixas de comissao
  await prisma.faixaComissao.deleteMany();

  await prisma.faixaComissao.createMany({
    data: [
      {
        ordem: 1,
        volumeMinimo: 0,
        volumeMaximo: 120000,
        percentualOver: 0.35,
        ativa: true,
      },
      {
        ordem: 2,
        volumeMinimo: 120000,
        volumeMaximo: 170000,
        percentualOver: 0.45,
        ativa: true,
      },
      {
        ordem: 3,
        volumeMinimo: 170000,
        volumeMaximo: null,
        percentualOver: 0.50,
        ativa: true,
      },
    ],
  });
  console.log("Faixas de comissao criadas");

  // Criar vendas da Juliana (apenas se ainda nao existem — seguro para re-seed)
  // Em producao (isProducao=true) juliana pode ser null se nao houver @gmail correspondente
  const existingVendasJuliana = juliana
    ? await prisma.venda.count({ where: { vendedorId: juliana.id } })
    : 1; // se null, finge que já tem vendas (pula criação)
  if (existingVendasJuliana === 0 && juliana) {
    await prisma.venda.createMany({
      data: [
        // JANEIRO 2026
        {
          vendedorId: juliana.id,
          cliente: "Jose Adriano de Souza",
          formaPagamento: "SANTANDER",
          distribuidora: "BELENERGY",
          valorVenda: 13400,
          kwp: 4.68,
          custoEquipamentos: 5959.40,
          geracaoKwh: 636.48,
          over: 2673.08,
          margem: 2.25,
          comissaoVenda: 335.00,
          comissaoOver: 935.58,
          comissaoTotal: 1270.58,
          quantidadePlacas: 12,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 446.44,
          dataConversao: new Date("2026-01-12"),
          fonte: "TRÁFEGO",
          status: "AGUARDANDO",
          mesReferencia: "2026-01",
        },
        {
          vendedorId: juliana.id,
          cliente: "Fabiana Franca da Silva",
          formaPagamento: "SANTANDER",
          distribuidora: "BELENERGY",
          valorVenda: 13500,
          kwp: 5.26,
          custoEquipamentos: 7208.50,
          geracaoKwh: 715.36,
          over: 524.70,
          margem: 1.87,
          comissaoVenda: 337.50,
          comissaoOver: 183.65,
          comissaoTotal: 521.15,
          quantidadePlacas: 14,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 377.49,
          dataConversao: new Date("2026-01-14"),
          fonte: "TRÁFEGO",
          status: "AGUARDANDO",
          mesReferencia: "2026-01",
        },
        {
          vendedorId: juliana.id,
          cliente: "Maria do Ceu Lima",
          formaPagamento: "BV",
          distribuidora: "BELENERGY",
          valorVenda: 18000,
          kwp: 7.60,
          custoEquipamentos: 10726.14,
          geracaoKwh: 1033.6,
          over: 1910.79,
          margem: 1.68,
          comissaoVenda: 450.00,
          comissaoOver: 668.78,
          comissaoTotal: 1118.78,
          quantidadePlacas: 19,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 436.43,
          dataConversao: new Date("2026-01-13"),
          fonte: "INDICAÇÃO",
          status: "AGUARDANDO",
          mesReferencia: "2026-01",
        },
        // FEVEREIRO 2026
        {
          vendedorId: juliana.id,
          cliente: "Nilsa Raimunda de Berto",
          formaPagamento: "SANTANDER",
          distribuidora: "BLUESUN",
          valorVenda: 12890,
          kwp: 4.68,
          custoEquipamentos: 6043.27,
          geracaoKwh: 636.48,
          over: 2012.11,
          margem: 2.13,
          comissaoVenda: 322.25,
          comissaoOver: 704.24,
          comissaoTotal: 1026.49,
          quantidadePlacas: 12,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 410.82,
          dataConversao: new Date("2026-02-13"),
          fonte: "TRÁFEGO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
        {
          vendedorId: juliana.id,
          cliente: "Cilene Manoel dos Santos",
          formaPagamento: "SOLFÁCIL",
          distribuidora: "SOLFÁCIL",
          valorVenda: 7000,
          kwp: 2.34,
          custoEquipamentos: 3260.00,
          geracaoKwh: 318.24,
          over: 1132.00,
          margem: 2.15,
          comissaoVenda: 175.00,
          comissaoOver: 396.20,
          comissaoTotal: 571.20,
          quantidadePlacas: 6,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 224.40,
          dataConversao: new Date("2026-02-19"),
          fonte: "INDICAÇÃO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
      ],
    });
    console.log("Vendas da Juliana criadas: 3 Jan + 2 Fev (total 5)");
  } else {
    console.log(`Juliana ja tem ${existingVendasJuliana} vendas, pulando criacao`);
  }

  // Criar vendas do Daniel (VENDEDOR_EXTERNO, apenas se ainda nao existem — seguro para re-seed)
  const existingVendasDaniel = await prisma.venda.count({ where: { vendedorId: daniel.id } });
  if (existingVendasDaniel === 0) {
    await prisma.venda.createMany({
      data: [
        // FEVEREIRO 2026 — vendas do Daniel (comissao 3% + 50% do over)
        {
          vendedorId: daniel.id,
          cliente: "João Batista",
          formaPagamento: "SOLFÁCIL",
          distribuidora: "SOLFÁCIL",
          valorVenda: 8500,
          kwp: 2.34,
          custoEquipamentos: 3260.00,
          geracaoKwh: 318.24,
          over: 0,
          margem: 2.61,
          comissaoVenda: 255.00,
          comissaoOver: 0,
          comissaoTotal: 255.00,
          quantidadePlacas: 6,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 314.40,
          dataConversao: new Date("2026-02-27"),
          fonte: "TRÁFEGO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
        {
          vendedorId: daniel.id,
          cliente: "José Cavalcante",
          formaPagamento: "SOLFÁCIL",
          distribuidora: "SOLFÁCIL",
          valorVenda: 24000,
          kwp: 9.36,
          custoEquipamentos: 10890.90,
          geracaoKwh: 1272.96,
          over: 4396.38,
          margem: 2.20,
          comissaoVenda: 720.00,
          comissaoOver: 2198.19,
          comissaoTotal: 2918.19,
          quantidadePlacas: 24,
          custoVisitaTecnica: 120,
          custoCosern: 70,
          custoTrtCrea: 65,
          custoEngenheiro: 400,
          aliquotaImposto: 0.06,
          custoImposto: 786.55,
          dataConversao: new Date("2026-02-20"),
          fonte: "INDICAÇÃO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
      ],
    });
    console.log("Vendas do Daniel criadas: 2 Fev (total 2)");
  } else {
    console.log(`Daniel ja tem ${existingVendasDaniel} vendas, pulando criacao`);
  }

  // Criar registros SDR vinculados as vendas da Juliana — APENAS EM DESENVOLVIMENTO
  if (isProducao) {
    console.log("[SEED] Pulando criacao de registros SDR seed (producao).");
  } else {
    const vendasJuliana = juliana
      ? await prisma.venda.findMany({ where: { vendedorId: juliana.id }, orderBy: { dataConversao: "desc" } })
      : [];

    if (vendasJuliana.length >= 2 && emelly && juliana) {
      // Limpar registros SDR anteriores (para re-seed dev)
      await prisma.registroSDR.deleteMany({ where: { sdrId: emelly.id } });

      const venda1 = vendasJuliana[0];
      const venda2 = vendasJuliana[1];
      const dataConversao1 = new Date(venda1.dataConversao).toISOString().split("T")[0];
      const dataConversao2 = new Date(venda2.dataConversao).toISOString().split("T")[0];

      await prisma.registroSDR.create({
        data: {
          sdrId: emelly.id, dataRegistro: "2026-02-10", nomeCliente: venda1.cliente.trim(),
          vendedoraId: juliana.id, dataReuniao: "2026-02-10", compareceu: true,
          consideracoes: "Cliente indicada por vizinha, ja sabia dos beneficios",
          vendaVinculadaId: venda1.id, dataVendaVinculada: dataConversao1,
          comissaoReuniao: 20, comissaoVenda: 20, comissaoTotal: 40,
          statusPagamento: "PENDENTE", statusLead: "VENDIDO",
        },
      });
      await prisma.registroSDR.create({
        data: {
          sdrId: emelly.id, dataRegistro: "2026-02-12", nomeCliente: venda2.cliente.trim(),
          vendedoraId: juliana.id, dataReuniao: "2026-02-12", compareceu: true,
          consideracoes: "Cliente muito interessada, boa conversa sobre economia na conta de luz",
          vendaVinculadaId: venda2.id, dataVendaVinculada: dataConversao2,
          comissaoReuniao: 20, comissaoVenda: 20, comissaoTotal: 40,
          statusPagamento: "PENDENTE", statusLead: "VENDIDO",
        },
      });
      await prisma.registroSDR.create({
        data: {
          sdrId: emelly.id, dataRegistro: "2026-02-14", nomeCliente: "Maria das Gracas Oliveira",
          vendedoraId: juliana.id, dataReuniao: "2026-02-14", compareceu: false,
          motivoNaoCompareceu: "Remarcou", consideracoes: "Cliente pediu para remarcar",
          comissaoReuniao: 0, comissaoVenda: 0, comissaoTotal: 0,
          statusPagamento: "PENDENTE", statusLead: "AGENDADO",
        },
      });
      await prisma.registroSDR.create({
        data: {
          sdrId: emelly.id, dataRegistro: "2026-02-15", nomeCliente: "Francisco Alves da Silva",
          vendedoraId: juliana.id, dataReuniao: "2026-02-15", compareceu: true,
          consideracoes: "Cliente pediu proposta, aguardando retorno",
          comissaoReuniao: 20, comissaoVenda: 0, comissaoTotal: 20,
          statusPagamento: "PENDENTE", statusLead: "COMPARECEU",
        },
      });
      await prisma.registroSDR.create({
        data: {
          sdrId: emelly.id, dataRegistro: "2026-02-08", nomeCliente: "Jose Carlos Ferreira",
          vendedoraId: juliana.id, dataReuniao: "2026-02-08", compareceu: true,
          consideracoes: "Cliente compareceu mas CPF negativado, sem condicoes",
          comissaoReuniao: 20, comissaoVenda: 0, comissaoTotal: 20,
          statusPagamento: "PENDENTE", statusLead: "FINALIZADO", motivoFinalizacao: "CPF negada",
        },
      });
      console.log("5 registros SDR seed criados (dev)");
    } else {
      console.log("Juliana nao tem vendas suficientes para vincular registros SDR");
    }
  }

  // Seed Pos Venda — clientes da planilha original (apenas se yuri existe e não é producao)
  if (!yuri || isProducao) {
    console.log("[SEED] Pulando seed de Pos Venda (producao ou yuri nao encontrado).");
  } else {
  // Limpar registros anteriores do operador (para re-seed)
  await prisma.posVenda.deleteMany({ where: { operadorId: yuri.id } });

  const clientesPosVenda = [
    {
      nomeCliente: "Kleuber",
      telefone: "84 996859195",
      etapa: "AGUARDANDO_VISTORIA",
      ultimaAcao: "Confirmei Instalação",
      proximaAcao: "Explicar sobre a vistoria",
      observacoes: "Apos troca, start no acompanhamento de 30 dias.",
      ultimoContato: "2026-02-20",
      proximoContato: "2026-02-23",
    },
    {
      nomeCliente: "Dona Vera",
      telefone: "84 94830010",
      etapa: "POS_ATIVACAO",
      ultimaAcao: "Criei conta",
      proximaAcao: "Acompanhamento Inicial",
      observacoes: "Feedback de geração apos 30 dias",
      ultimoContato: "2026-02-10",
      proximoContato: "2026-02-27",
    },
    {
      nomeCliente: "Vanuza",
      telefone: "(84) 91734466",
      etapa: "AGUARDANDO_VISTORIA",
      ultimaAcao: "Confirmei Instalação",
      proximaAcao: "Aguardar aprovação + Vistoria",
      observacoes: "Aguardar projeto ser aprovado",
      ultimoContato: "2026-02-20",
      proximoContato: "2026-02-23",
    },
    {
      nomeCliente: "Elisangela",
      telefone: "8499503829",
      etapa: "AGUARDANDO_MATERIAL",
      ultimaAcao: "Visita Técnica",
      proximaAcao: "Inf prazo de material",
      observacoes: "Previsão dia 03/03/2026",
      ultimoContato: "2026-02-18",
      proximoContato: "2026-02-25",
    },
    {
      nomeCliente: "Fabiana",
      telefone: "8499818431",
      etapa: "AGUARDANDO_MATERIAL",
      ultimaAcao: "Visita Técnica",
      proximaAcao: "Inf prazo de material",
      observacoes: "Previsão dia 03/03/2026",
      ultimoContato: "2026-02-18",
      proximoContato: "2026-02-25",
    },
    {
      nomeCliente: "Maria do Céu",
      telefone: "84986886393",
      etapa: "AGUARDANDO_MATERIAL",
      ultimaAcao: "Visita Técnica",
      proximaAcao: "Inf prazo de material",
      observacoes: "Previsão dia 27/02/2026",
      ultimoContato: "2026-02-18",
      proximoContato: "2026-02-25",
    },
    {
      nomeCliente: "Nilsa",
      telefone: "8488231203",
      etapa: "VISITA_TECNICA",
      ultimaAcao: "Agendei Visita Técnica",
      proximaAcao: "Pegar informações da Visita",
      observacoes: "Relembrar ao cliente próximo a data",
      ultimoContato: "2026-02-18",
      proximoContato: "2026-02-23",
    },
    {
      nomeCliente: "Cilene",
      telefone: "8491171300",
      etapa: "VISITA_TECNICA",
      ultimaAcao: "Agendei Visita Técnica",
      proximaAcao: "Pegar informações da Visita",
      observacoes: "Relembrar ao cliente próximo a data",
      ultimoContato: "2026-02-13",
      proximoContato: "2026-02-23",
    },
    {
      nomeCliente: "João Batista",
      telefone: "84 9813-5478",
      etapa: "CONCLUIDA",
      ultimaAcao: "Tentei contato",
      proximaAcao: "Tentar contato novamente",
      observacoes: "LEMBRAR DE TENTAR CONTATO",
      ultimoContato: "2026-02-20",
      proximoContato: "2026-02-20",
    },
    {
      nomeCliente: "José Cavalcante",
      telefone: "84987270314",
      etapa: "TRAMITES",
      ultimaAcao: "Assinou contrato",
      proximaAcao: "Assinar biometria e gerar pedido",
      observacoes: "Só próximo mês",
      ultimoContato: null,
      proximoContato: null,
    },
  ];

  for (const cliente of clientesPosVenda) {
    await prisma.posVenda.create({
      data: {
        operadorId: yuri.id,
        ...cliente,
      },
    });
  }
  console.log(`${clientesPosVenda.length} clientes de Pos Venda criados`);
  } // fim do bloco posVenda (apenas dev)

  console.log("\n=== SEED COMPLETO ===");
  console.log("\nUsuarios criados:");
  // =====================================================
  // ATUALIZAR CUSTOS DE TODAS AS VENDAS EXISTENTES
  // (garante que vendas ja existentes recebam custos)
  // =====================================================
  const todasVendas = await prisma.venda.findMany();
  for (const v of todasVendas) {
    const placasEstimadas = Math.ceil(v.kwp * 2.5);
    const aliquota = v.aliquotaImposto ?? 0.06;
    const imposto = aliquota * (v.valorVenda - v.custoEquipamentos);
    const visitaTecnica = v.custoVisitaTecnica ?? 120;
    const cosern = v.custoCosern ?? 70;
    const trtCrea = v.custoTrtCrea ?? 65;
    const engenheiro = v.custoEngenheiro ?? 400;
    const materialCA = v.custoMaterialCA ?? 500;
    const instalacao = (placasEstimadas * 70) + ((v.quantidadeInversores || 1) * 250);
    const comissaoVendedorCusto = v.comissaoTotal;

    const custoTotal = v.custoEquipamentos + instalacao + visitaTecnica + cosern + trtCrea + engenheiro + materialCA + imposto + comissaoVendedorCusto;
    const lucroLiquido = v.valorVenda - custoTotal;
    const margemLucroLiquido = v.valorVenda > 0 ? lucroLiquido / v.valorVenda : 0;

    await prisma.venda.update({
      where: { id: v.id },
      data: {
        quantidadePlacas: v.quantidadePlacas === 0 ? placasEstimadas : v.quantidadePlacas,
        aliquotaImposto: aliquota,
        custoImposto: imposto,
        custoVisitaTecnica: visitaTecnica,
        custoCosern: cosern,
        custoTrtCrea: trtCrea,
        custoEngenheiro: engenheiro,
        custoMaterialCA: materialCA,
        custoInstalacao: instalacao,
        comissaoVendedorCusto: comissaoVendedorCusto,
        lucroLiquido: lucroLiquido,
        margemLucroLiquido: margemLucroLiquido,
      },
    });
  }
  console.log(`Custos atualizados para ${todasVendas.length} vendas (placas, impostos, custos operacionais, lucro)`);

  console.log("  Supervisor (Eric Lima):     supervisor@solar.com / supervisor123");
  console.log("  Diretor (Erick Santos):     diretor@solar.com / diretor123");
  console.log("  Bruna (Vendedor):           bruna@solar.com / vendedor123");
  console.log("  Juliana (Vendedor):         juliana@solar.com / vendedor123");
  console.log("  Daniel (Vendedor Externo):  daniel@solar.com / vendedor123");
  console.log("  SDR (Emelly):               emelly@solar.com / sdr123");
  console.log("  Pos Venda (Yuri):           yuri@solar.com / posvenda123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

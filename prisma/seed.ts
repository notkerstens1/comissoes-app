import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Criar supervisor (role ADMIN no banco, exibido como "Supervisor")
  const senhaSupervisor = await hash("supervisor123", 12);
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@solar.com" },
    update: { nome: "Eric Lima" },
    create: {
      nome: "Eric Lima",
      email: "supervisor@solar.com",
      senha: senhaSupervisor,
      role: "ADMIN",
    },
  });
  console.log("Supervisor criado:", supervisor.email);

  // Criar diretor
  const senhaDiretor = await hash("diretor123", 12);
  const diretor = await prisma.user.upsert({
    where: { email: "diretor@solar.com" },
    update: { nome: "Erick Santos" },
    create: {
      nome: "Erick Santos",
      email: "diretor@solar.com",
      senha: senhaDiretor,
      role: "DIRETOR",
    },
  });
  console.log("Diretor criado:", diretor.email);

  // Criar vendedores
  const senhaVendedor = await hash("vendedor123", 12);

  // Desativar usuarios com emails antigos/errados
  await prisma.user.updateMany({
    where: { email: { in: ["juliana@solar.com", "erick@solar.com", "daniel@solar.com"] } },
    data: { ativo: false },
  });
  console.log("Usuarios antigos desativados (se existiam)");

  const bruna = await prisma.user.upsert({
    where: { email: "bruna@solar.com" },
    update: { nome: "Bruna", ativo: true },
    create: {
      nome: "Bruna",
      email: "bruna@solar.com",
      senha: senhaVendedor,
      role: "VENDEDOR",
    },
  });
  console.log("Vendedor criado:", bruna.email);

  const juliana = await prisma.user.upsert({
    where: { email: "juliana@solar.com" },
    update: { nome: "Juliana", email: "juliana@solar.com", ativo: true },
    create: {
      nome: "Juliana",
      email: "juliana@solar.com",
      senha: senhaVendedor,
      role: "VENDEDOR",
    },
  });
  console.log("Vendedor criado:", juliana.email);

  // Criar operador Pos Venda
  const senhaPosVenda = await hash("posvenda123", 12);
  const ana = await prisma.user.upsert({
    where: { email: "ana@solar.com" },
    update: { nome: "Ana Lima", ativo: true },
    create: {
      nome: "Ana Lima",
      email: "ana@solar.com",
      senha: senhaPosVenda,
      role: "POS_VENDA",
    },
  });
  console.log("Pos Venda criada:", ana.email);

  // Criar SDR
  const senhaSDR = await hash("sdr123", 12);
  const emelly = await prisma.user.upsert({
    where: { email: "emelly@solar.com" },
    update: { nome: "Emelly", ativo: true },
    create: {
      nome: "Emelly",
      email: "emelly@solar.com",
      senha: senhaSDR,
      role: "SDR",
    },
  });
  console.log("SDR criada:", emelly.email);

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
  const existingVendasJuliana = await prisma.venda.count({ where: { vendedorId: juliana.id } });
  if (existingVendasJuliana === 0) {
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
          dataConversao: new Date("2026-02-19"),
          fonte: "INDICAÇÃO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
        // FEVEREIRO 2026 — vendas do Daniel (comissao 3%, logica diferente)
        {
          vendedorId: juliana.id,
          cliente: "[Daniel] João Batista",
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
          dataConversao: new Date("2026-02-27"),
          fonte: "TRÁFEGO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
        {
          vendedorId: juliana.id,
          cliente: "[Daniel] José Cavalcante",
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
          dataConversao: new Date("2026-02-20"),
          fonte: "INDICAÇÃO",
          status: "AGUARDANDO",
          mesReferencia: "2026-02",
        },
      ],
    });
    console.log("Vendas criadas: 3 Jan (Juliana) + 4 Fev (2 Juliana + 2 Daniel) = total 7");
  } else {
    console.log(`Juliana ja tem ${existingVendasJuliana} vendas, pulando criacao`);
  }

  // Criar registros SDR vinculados as vendas da Juliana
  // Buscar vendas da Juliana (as 2 mais recentes = Cilene fev/19 e Nilsa fev/13)
  const vendasJuliana = await prisma.venda.findMany({
    where: { vendedorId: juliana.id },
    orderBy: { dataConversao: "desc" },
  });

  if (vendasJuliana.length >= 2) {
    // Limpar registros SDR anteriores (para re-seed)
    await prisma.registroSDR.deleteMany({ where: { sdrId: emelly.id } });

    const venda1 = vendasJuliana[0]; // Cilene (mais recente: 19/02)
    const venda2 = vendasJuliana[1]; // Nilsa (segunda mais recente: 13/02)

    const dataConversao1 = new Date(venda1.dataConversao).toISOString().split("T")[0];
    const dataConversao2 = new Date(venda2.dataConversao).toISOString().split("T")[0];

    // Registro 1 — Cilene (reuniao 10/02, compareceu, venda vinculada em 19/02)
    await prisma.registroSDR.create({
      data: {
        sdrId: emelly.id,
        dataRegistro: "2026-02-10",
        nomeCliente: venda1.cliente.trim(),
        vendedoraId: juliana.id,
        dataReuniao: "2026-02-10",
        compareceu: true,
        consideracoes: "Cliente indicada por vizinha, ja sabia dos beneficios",
        vendaVinculadaId: venda1.id,
        dataVendaVinculada: dataConversao1,
        comissaoReuniao: 20,
        comissaoVenda: 20,
        comissaoTotal: 40,
        statusPagamento: "PENDENTE",
        statusLead: "VENDIDO",
      },
    });
    console.log("Registro SDR criado: " + venda1.cliente.trim() + " (vinculado)");

    // Registro 2 — Nilsa (reuniao 12/02, compareceu, venda vinculada em 13/02)
    await prisma.registroSDR.create({
      data: {
        sdrId: emelly.id,
        dataRegistro: "2026-02-12",
        nomeCliente: venda2.cliente.trim(),
        vendedoraId: juliana.id,
        dataReuniao: "2026-02-12",
        compareceu: true,
        consideracoes: "Cliente muito interessada, boa conversa sobre economia na conta de luz",
        vendaVinculadaId: venda2.id,
        dataVendaVinculada: dataConversao2,
        comissaoReuniao: 20,
        comissaoVenda: 20,
        comissaoTotal: 40,
        statusPagamento: "PENDENTE",
        statusLead: "VENDIDO",
      },
    });
    console.log("Registro SDR criado: " + venda2.cliente.trim() + " (vinculado)");

    // Registro 3 — Lead extra que nao compareceu (para mostrar variedade)
    await prisma.registroSDR.create({
      data: {
        sdrId: emelly.id,
        dataRegistro: "2026-02-14",
        nomeCliente: "Maria das Gracas Oliveira",
        vendedoraId: juliana.id,
        dataReuniao: "2026-02-14",
        compareceu: false,
        motivoNaoCompareceu: "Remarcou",
        consideracoes: "Cliente pediu para remarcar para semana que vem",
        comissaoReuniao: 0,
        comissaoVenda: 0,
        comissaoTotal: 0,
        statusPagamento: "PENDENTE",
        statusLead: "AGENDADO",
      },
    });
    console.log("Registro SDR criado: Maria das Gracas Oliveira (nao compareceu)");

    // Registro 4 — Lead que compareceu mas ainda nao virou venda
    await prisma.registroSDR.create({
      data: {
        sdrId: emelly.id,
        dataRegistro: "2026-02-15",
        nomeCliente: "Francisco Alves da Silva",
        vendedoraId: juliana.id,
        dataReuniao: "2026-02-15",
        compareceu: true,
        consideracoes: "Cliente pediu proposta, aguardando retorno",
        comissaoReuniao: 20,
        comissaoVenda: 0,
        comissaoTotal: 20,
        statusPagamento: "PENDENTE",
        statusLead: "COMPARECEU",
      },
    });
    console.log("Registro SDR criado: Francisco Alves da Silva (aguardando venda)");

    // Registro 5 — Lead finalizado (CPF negada)
    await prisma.registroSDR.create({
      data: {
        sdrId: emelly.id,
        dataRegistro: "2026-02-08",
        nomeCliente: "Jose Carlos Ferreira",
        vendedoraId: juliana.id,
        dataReuniao: "2026-02-08",
        compareceu: true,
        consideracoes: "Cliente compareceu mas CPF negativado, sem condicoes",
        comissaoReuniao: 20,
        comissaoVenda: 0,
        comissaoTotal: 20,
        statusPagamento: "PENDENTE",
        statusLead: "FINALIZADO",
        motivoFinalizacao: "CPF negada",
      },
    });
    console.log("Registro SDR criado: Jose Carlos Ferreira (finalizado - CPF negada)");
  } else {
    console.log("Juliana nao tem vendas suficientes para vincular registros SDR");
  }

  // Seed Pos Venda — clientes da planilha original
  // Limpar registros anteriores do operador (para re-seed)
  await prisma.posVenda.deleteMany({ where: { operadorId: ana.id } });

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
        operadorId: ana.id,
        ...cliente,
      },
    });
  }
  console.log(`${clientesPosVenda.length} clientes de Pos Venda criados`);

  console.log("\n=== SEED COMPLETO ===");
  console.log("\nUsuarios criados:");
  console.log("  Supervisor (Eric Lima):   supervisor@solar.com / supervisor123");
  console.log("  Diretor (Erick Santos):   diretor@solar.com / diretor123");
  console.log("  Bruna:                    bruna@solar.com / vendedor123");
  console.log("  Juliana:                  juliana@solar.com / vendedor123");
  console.log("  SDR (Emelly):             emelly@solar.com / sdr123");
  console.log("  Pos Venda (Ana Lima):     ana@solar.com / posvenda123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

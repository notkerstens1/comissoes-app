import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// 1. Vendas com "dados de engenharia" (o filtro da pagina margem)
const totalVendas = await prisma.venda.count();
const comMetragem = await prisma.venda.count({ where: { metragemCaboPrevista: { not: null } } });
const comEstimado = await prisma.venda.count({ where: { custoInstalacaoEstimado: { not: null } } });
const comReal = await prisma.venda.count({ where: { custoInstalacaoReal: { not: null } } });

console.log('=== VENDAS (base da pagina Margem) ===');
console.log('total vendas:', totalVendas);
console.log('com metragemCaboPrevista (=> aparece na margem):', comMetragem);
console.log('com custoInstalacaoEstimado:', comEstimado);
console.log('com custoInstalacaoReal (=> "concluida"):', comReal);

// 2. Vendas convertidas em jul/2026 (periodo do print) e se tem eng data
const julInicio = new Date('2026-07-01T00:00:00-03:00');
const julFim = new Date('2026-07-10T00:00:00-03:00');
const vendasJul = await prisma.venda.findMany({
  where: { dataConversao: { gte: julInicio, lt: julFim } },
  select: { id: true, cliente: true, dataConversao: true, metragemCaboPrevista: true, custoInstalacaoEstimado: true, custoInstalacaoReal: true, statusMargemInstalacao: true },
  orderBy: { dataConversao: 'asc' },
});
console.log('\n=== VENDAS convertidas 01-09/jul (periodo do print):', vendasJul.length, '===');
for (const v of vendasJul) {
  console.log(`  ${v.cliente} | metragem=${v.metragemCaboPrevista ?? '—'} | est=${v.custoInstalacaoEstimado ?? '—'} | real=${v.custoInstalacaoReal ?? '—'} | ${v.statusMargemInstalacao ?? '—'}`);
}

// 3. Cards do setor tecnico na etapa MATERIAL_COMPRADO e se estao ligados a venda com eng data
const cardsMaterial = await prisma.setorTecnico.findMany({
  where: { ativo: true, etapaInstalacao: 'MATERIAL_COMPRADO' },
  select: { id: true, nomeCliente: true, vendaId: true, venda: { select: { metragemCaboPrevista: true, custoInstalacaoEstimado: true } } },
});
console.log('\n=== CARDS em "Material CA Comprado":', cardsMaterial.length, '===');
for (const c of cardsMaterial) {
  console.log(`  ${c.nomeCliente} | vendaId=${c.vendaId ?? 'SEM VENDA'} | metragemVenda=${c.venda?.metragemCaboPrevista ?? '—'} | estVenda=${c.venda?.custoInstalacaoEstimado ?? '—'}`);
}

// 4. Panorama: quantos cards tecnicos tem vendaId
const totalCards = await prisma.setorTecnico.count({ where: { ativo: true } });
const cardsSemVenda = await prisma.setorTecnico.count({ where: { ativo: true, vendaId: null } });
console.log('\n=== CARDS TECNICOS ===');
console.log('total ativos:', totalCards, '| sem vendaId ligada:', cardsSemVenda);

// 5. Config de limites
const config = await prisma.configuracao.findFirst({ select: { limiteCustoInstalacao: true, metragemCaboPadrao: true, metragemCaboTolerada: true, custoMaterialCAPadrao: true } });
console.log('\n=== CONFIG (limites verde/amarelo/vermelho) ===');
console.log(config);

await prisma.$disconnect();

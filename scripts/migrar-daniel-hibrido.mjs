// Migracao pos-deploy: muda Daniel pra VENDEDOR_HIBRIDO e marca vendas
// historicas dele como EXTERNA (porta a porta — over flat 50%).
//
// Como rodar:
//   1. Ter .env.production.local com DATABASE_URL apontando pra Railway
//   2. node --env-file=.env.production.local scripts/migrar-daniel-hibrido.mjs
//
// Idempotente: pode rodar mais de uma vez sem efeito colateral.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const daniel = await prisma.user.findUnique({
  where: { email: 'daniel@solar.com' },
  select: { id: true, nome: true, role: true },
});

if (!daniel) {
  console.error('Daniel nao encontrado (daniel@solar.com)');
  process.exit(1);
}

console.log(`Daniel encontrado: ${daniel.id} · role atual: ${daniel.role}`);

if (daniel.role !== 'VENDEDOR_HIBRIDO') {
  await prisma.user.update({
    where: { id: daniel.id },
    data: { role: 'VENDEDOR_HIBRIDO' },
  });
  console.log('Role atualizada para VENDEDOR_HIBRIDO');
} else {
  console.log('Role ja era VENDEDOR_HIBRIDO, mantendo');
}

const vendasDaniel = await prisma.venda.findMany({
  where: { vendedorId: daniel.id },
  select: { id: true, cliente: true, mesReferencia: true, tipoVenda: true, valorVenda: true },
  orderBy: { dataConversao: 'asc' },
});

console.log(`\nVendas do Daniel: ${vendasDaniel.length}`);
vendasDaniel.forEach((v) => {
  console.log(`  · ${v.mesReferencia} · ${v.cliente} · R$${v.valorVenda.toLocaleString('pt-BR')} · tipoVenda: ${v.tipoVenda}`);
});

const aMarcar = vendasDaniel.filter((v) => v.tipoVenda !== 'EXTERNA');
if (aMarcar.length > 0) {
  const r = await prisma.venda.updateMany({
    where: { vendedorId: daniel.id, tipoVenda: { not: 'EXTERNA' } },
    data: { tipoVenda: 'EXTERNA' },
  });
  console.log(`\n${r.count} venda(s) atualizada(s) para tipoVenda=EXTERNA`);
} else {
  console.log('\nTodas as vendas ja estao marcadas como EXTERNA');
}

console.log('\nPronto. Vendas futuras do Daniel sao escolhidas no form (Inbound | Externa).');

await prisma.$disconnect();

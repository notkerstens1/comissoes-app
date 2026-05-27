import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const daniel = await prisma.user.findFirst({
  where: { nome: { contains: 'Daniel', mode: 'insensitive' } },
  select: { id: true, nome: true, role: true, ativo: true, email: true },
});

console.log('=== Daniel ===');
console.log(daniel);
console.log();

if (!daniel) process.exit(0);

const vendas = await prisma.venda.findMany({
  where: { vendedorId: daniel.id },
  orderBy: { dataConversao: 'asc' },
  select: {
    id: true,
    cliente: true,
    dataConversao: true,
    mesReferencia: true,
    valorVenda: true,
    custoEquipamentos: true,
    margem: true,
    over: true,
    fonte: true,
    tipoVenda: true,
    comissaoVenda: true,
    comissaoOver: true,
    comissaoTotal: true,
    status: true,
  },
});

const fmt = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
console.log(`Total vendas Daniel: ${vendas.length}`);
console.log();
console.log('id | data | cliente | valor | margem | over | fonte | tipoVenda | cVenda | cOver | cTotal | status');
for (const v of vendas) {
  console.log([
    v.id.slice(0, 8),
    v.dataConversao.toISOString().slice(0, 10),
    (v.cliente || '').slice(0, 25).padEnd(25),
    fmt(v.valorVenda).padStart(12),
    (v.margem ?? 0).toFixed(2),
    fmt(v.over).padStart(10),
    (v.fonte || '—').padEnd(10),
    (v.tipoVenda || '—').padEnd(8),
    fmt(v.comissaoVenda).padStart(9),
    fmt(v.comissaoOver).padStart(9),
    fmt(v.comissaoTotal).padStart(10),
    v.status,
  ].join(' | '));
}

await prisma.$disconnect();

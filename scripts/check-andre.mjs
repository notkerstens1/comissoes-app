import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const vendas = await prisma.venda.findMany({
  where: { cliente: { contains: 'André', mode: 'insensitive' } },
  include: { vendedor: { select: { nome: true, role: true } } },
  orderBy: { createdAt: 'desc' },
});

const alt = await prisma.venda.findMany({
  where: { cliente: { contains: 'Andre', mode: 'insensitive' } },
  include: { vendedor: { select: { nome: true, role: true } } },
  orderBy: { createdAt: 'desc' },
});

const all = [...vendas, ...alt].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);

for (const v of all) {
  console.log('====================================');
  console.log('cliente          :', v.cliente);
  console.log('vendedor         :', v.vendedor?.nome, `(${v.vendedor?.role})`);
  console.log('mesReferencia    :', v.mesReferencia);
  console.log('valorVenda       :', v.valorVenda);
  console.log('custoEquipamentos:', v.custoEquipamentos);
  console.log('margem           :', v.margem);
  console.log('over             :', v.over);
  console.log('excecao          :', v.excecao);
  console.log('tipoVenda        :', v.tipoVenda);
  console.log('comissaoVenda    :', v.comissaoVenda);
  console.log('comissaoOver     :', v.comissaoOver);
  console.log('comissaoTotal    :', v.comissaoTotal);
  console.log('over_se_15x      :', Math.max(v.valorVenda - v.custoEquipamentos * 1.5, 0).toFixed(2));
  console.log('over_se_165x     :', Math.max(v.valorVenda - v.custoEquipamentos * 1.65, 0).toFixed(2));
  console.log('id               :', v.id);
}
console.log('\nTOTAL encontrados:', all.length);
await prisma.$disconnect();

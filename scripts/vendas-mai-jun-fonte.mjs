import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

for (const mes of ['2026-05', '2026-06']) {
  const vendas = await prisma.venda.findMany({
    where: { mesReferencia: mes },
    include: { registrosSDR: { select: { nomeCliente: true } } },
    orderBy: { dataConversao: 'asc' },
  });
  const porFonte = {}, porTipo = {};
  let receita = 0;
  for (const v of vendas) {
    receita += v.valorVenda;
    porFonte[v.fonte || 'sem_fonte'] = (porFonte[v.fonte || 'sem_fonte'] || 0) + 1;
    porTipo[v.tipoVenda || '—'] = (porTipo[v.tipoVenda || '—'] || 0) + 1;
  }
  console.log(`\n===== ${mes} =====`);
  console.log(`Vendas: ${vendas.length} | Receita: R$ ${receita.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
  console.log('Por fonte:', porFonte);
  console.log('Por tipo:', porTipo);
}
await prisma.$disconnect();

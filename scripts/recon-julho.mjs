import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const fmt = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// TODAS as vendas que tocam julho de qualquer forma
const vendas = await prisma.venda.findMany({
  where: {
    OR: [
      { mesReferencia: '2026-07' },
      { dataConversao: { gte: new Date('2026-06-25T00:00:00-03:00'), lt: new Date('2026-08-01T00:00:00-03:00') } },
    ],
  },
  include: { vendedor: { select: { nome: true } } },
  orderBy: { dataConversao: 'asc' },
});

console.log(`Total no conjunto amplo: ${vendas.length}\n`);
console.log('dataConversao(ISO-utc) | mesRef | atipica | excecao | status | fonte | vendedor | cliente | valor');
for (const v of vendas) {
  const dc = v.dataConversao.toISOString();
  const dcLocal = new Date(v.dataConversao.getTime() - 3*3600*1000).toISOString().slice(0,16); // aprox -03
  console.log(`${dcLocal} | ${v.mesReferencia} | atip:${v.atipica?'S':'-'} | exc:${v.excecao?'S':'-'} | ${v.status} | ${(v.fonte||'—').padEnd(9)} | ${(v.vendedor.nome||'').slice(0,10).padEnd(10)} | ${(v.cliente||'').slice(0,24).padEnd(24)} | R$ ${fmt(v.valorVenda)}`);
}

// Contagens por critério
const porMesRef = vendas.filter(v => v.mesReferencia === '2026-07');
const porDataConv0117 = vendas.filter(v => {
  const d = v.dataConversao;
  return d >= new Date('2026-07-01T00:00:00-03:00') && d < new Date('2026-07-18T00:00:00-03:00');
});
const porDataConvMes = vendas.filter(v => {
  const d = v.dataConversao;
  return d >= new Date('2026-07-01T00:00:00-03:00') && d < new Date('2026-08-01T00:00:00-03:00');
});
console.log(`\n--- Contagens ---`);
console.log(`mesReferencia='2026-07': ${porMesRef.length}`);
console.log(`dataConversao 01-17/07: ${porDataConv0117.length}`);
console.log(`dataConversao mês todo julho: ${porDataConvMes.length}`);

// Quais estão em mesRef julho mas NÃO no range 01-17
const soMesRef = porMesRef.filter(v => !porDataConv0117.includes(v));
console.log(`\nEm mesRef=julho mas fora do 01-17 por dataConversao:`);
for (const v of soMesRef) console.log(`  ${v.dataConversao.toISOString()} | ${v.mesReferencia} | ${v.cliente} | R$ ${fmt(v.valorVenda)} | atip:${v.atipica}`);

await prisma.$disconnect();

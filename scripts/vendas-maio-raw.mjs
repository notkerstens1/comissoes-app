import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const rows = await prisma.$queryRawUnsafe(`
  SELECT v.id, v.cliente, v."valorVenda", v."comissaoTotal", v.kwp, v.fonte,
         v.status, v."dataConversao", v.distribuidora, v."mesReferencia",
         u.nome AS vendedor_nome
  FROM "Venda" v
  LEFT JOIN "User" u ON u.id = v."vendedorId"
  WHERE v."mesReferencia" = '2026-05'
     OR (v."dataConversao" >= '2026-05-01' AND v."dataConversao" < '2026-06-01')
  ORDER BY v."dataConversao" ASC
`);

console.log(`Total vendas maio 2026: ${rows.length}`);
let receita = 0, comissao = 0, kwp = 0;
const porVendedor = {}, porFonte = {}, porStatus = {};
for (const v of rows) {
  receita += Number(v.valorVenda);
  comissao += Number(v.comissaoTotal);
  kwp += Number(v.kwp);
  porVendedor[v.vendedor_nome || '?'] = (porVendedor[v.vendedor_nome || '?'] || 0) + 1;
  porFonte[v.fonte || 'sem_fonte'] = (porFonte[v.fonte || 'sem_fonte'] || 0) + 1;
  porStatus[v.status] = (porStatus[v.status] || 0) + 1;
}
const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
console.log(`Receita: R$ ${fmt(receita)}`);
console.log(`Ticket médio: R$ ${rows.length ? fmt(receita/rows.length) : '0'}`);
console.log(`Comissão: R$ ${fmt(comissao)}`);
console.log(`kWp: ${kwp.toFixed(2)}`);
console.log('Por vendedor:', porVendedor);
console.log('Por fonte:', porFonte);
console.log('Por status:', porStatus);
console.log();
console.log('=== Detalhe ===');
for (const v of rows) {
  const d = v.dataConversao.toISOString().slice(0,10);
  const vn = (v.vendedor_nome || '?').slice(0,12).padEnd(12);
  const fonte = (v.fonte || '—').slice(0,18).padEnd(18);
  const cli = (v.cliente || '').slice(0,30).padEnd(30);
  const val = `R$ ${fmt(Number(v.valorVenda))}`.padStart(15);
  console.log(`${d} | ${cli} | ${val} | ${vn} | ${fonte} | ${v.status}`);
}
await prisma.$disconnect();

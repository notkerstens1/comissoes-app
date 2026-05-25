import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const vendas = await prisma.venda.findMany({
  where: {
    OR: [
      { mesReferencia: '2026-05' },
      {
        dataConversao: {
          gte: new Date('2026-05-01T00:00:00-03:00'),
          lt: new Date('2026-06-01T00:00:00-03:00'),
        },
      },
    ],
  },
  include: {
    vendedor: { select: { nome: true } },
    registrosSDR: { select: { sdr: { select: { nome: true } }, nomeCliente: true } },
  },
  orderBy: { dataConversao: 'asc' },
});

const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

console.log(`Total vendas maio 2026: ${vendas.length}`);
console.log();

let receita = 0, comissao = 0, kwp = 0;
const porVendedor = {}, porFonte = {}, porDistribuidora = {}, porStatus = {};

for (const v of vendas) {
  receita += v.valorVenda;
  comissao += v.comissaoTotal;
  kwp += v.kwp;
  porVendedor[v.vendedor.nome] = (porVendedor[v.vendedor.nome] || 0) + 1;
  porFonte[v.fonte || 'sem_fonte'] = (porFonte[v.fonte || 'sem_fonte'] || 0) + 1;
  porDistribuidora[v.distribuidora || 'sem_dist'] = (porDistribuidora[v.distribuidora || 'sem_dist'] || 0) + 1;
  porStatus[v.status] = (porStatus[v.status] || 0) + 1;
}

console.log(`Receita total:    R$ ${fmt(receita)}`);
console.log(`Ticket médio:     R$ ${vendas.length ? fmt(receita / vendas.length) : '0,00'}`);
console.log(`Comissão total:   R$ ${fmt(comissao)}`);
console.log(`kWp total:        ${kwp.toFixed(2)}`);
console.log();
console.log('Por vendedor:     ', porVendedor);
console.log('Por fonte:        ', porFonte);
console.log('Por distribuidora:', porDistribuidora);
console.log('Por status:       ', porStatus);
console.log();
console.log('=== Detalhe das vendas (cronológico) ===');
for (const v of vendas) {
  const sdr = v.registrosSDR?.[0]?.sdr?.nome || '—';
  const data = v.dataConversao.toISOString().slice(0, 10);
  const cliente = (v.cliente || '').slice(0, 35).padEnd(35);
  const valor = `R$ ${fmt(v.valorVenda)}`.padStart(15);
  const vend = (v.vendedor.nome || '').slice(0, 10).padEnd(10);
  const fonte = (v.fonte || '—').slice(0, 14).padEnd(14);
  console.log(`${data} | ${cliente} | ${valor} | ${vend} | SDR:${sdr.slice(0, 10).padEnd(10)} | ${fonte} | ${v.status}`);
}

await prisma.$disconnect();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const vendas = await prisma.venda.findMany({
  where: {
    dataConversao: {
      gte: new Date('2026-05-01T00:00:00-03:00'),
      lt: new Date('2026-05-22T00:00:00-03:00'),
    },
  },
  select: {
    id: true, cliente: true, valorVenda: true, comissaoTotal: true,
    kwp: true, fonte: true, status: true, distribuidora: true,
    dataConversao: true, mesReferencia: true,
    vendedor: { select: { nome: true } },
    registrosSDR: { select: { sdr: { select: { nome: true } } } },
  },
  orderBy: { dataConversao: 'asc' },
});

const fmt = (n) => Number(n||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

console.log(`Total vendas 1-21 maio 2026: ${vendas.length}\n`);

let receita = 0, comissao = 0, kwp = 0;
const porVendedor = {}, porFonte = {}, porDistribuidora = {}, porStatus = {}, porSDR = {};

for (const v of vendas) {
  receita += Number(v.valorVenda||0);
  comissao += Number(v.comissaoTotal||0);
  kwp += Number(v.kwp||0);
  porVendedor[v.vendedor?.nome||'sem_vendedor'] = (porVendedor[v.vendedor?.nome||'sem_vendedor']||0) + 1;
  porFonte[v.fonte||'sem_fonte'] = (porFonte[v.fonte||'sem_fonte']||0) + 1;
  porDistribuidora[v.distribuidora||'sem_dist'] = (porDistribuidora[v.distribuidora||'sem_dist']||0) + 1;
  porStatus[v.status] = (porStatus[v.status]||0) + 1;
  const sdrNome = v.registrosSDR?.[0]?.sdr?.nome || 'sem_sdr';
  porSDR[sdrNome] = (porSDR[sdrNome]||0) + 1;
}

console.log(`Receita total:    R$ ${fmt(receita)}`);
console.log(`Ticket medio:     R$ ${vendas.length ? fmt(receita/vendas.length) : '0,00'}`);
console.log(`Comissao total:   R$ ${fmt(comissao)}`);
console.log(`kWp total:        ${kwp.toFixed(2)}\n`);
console.log('Por vendedor:    ', porVendedor);
console.log('Por SDR:         ', porSDR);
console.log('Por fonte:       ', porFonte);
console.log('Por distribuidora:', porDistribuidora);
console.log('Por status:      ', porStatus);
console.log('\n=== Detalhe das vendas ===');
for (const v of vendas) {
  const data = v.dataConversao.toISOString().slice(0,10);
  const cli = (v.cliente||'').slice(0,32).padEnd(32);
  const val = `R$ ${fmt(v.valorVenda)}`.padStart(14);
  const vend = (v.vendedor?.nome||'-').slice(0,11).padEnd(11);
  const sdr = (v.registrosSDR?.[0]?.sdr?.nome||'-').slice(0,10).padEnd(10);
  const fonte = (v.fonte||'-').slice(0,16).padEnd(16);
  console.log(`${data} | ${cli} | ${val} | ${vend} | SDR:${sdr} | ${fonte} | ${v.status}`);
}

await prisma.$disconnect();

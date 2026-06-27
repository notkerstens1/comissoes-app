import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const vendas = await prisma.venda.findMany({
  where: {
    OR: [
      { mesReferencia: { in: ['2026-01','2026-02','2026-03','2026-04','2026-05'] } },
      { dataConversao: { gte: new Date('2026-01-01T00:00:00-03:00'), lt: new Date('2026-06-01T00:00:00-03:00') } },
    ],
  },
  include: { vendedor: { select: { nome: true } } },
  orderBy: { dataConversao: 'asc' },
});

const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const mesOf = (v) => v.mesReferencia || v.dataConversao.toISOString().slice(0,7);

console.log(`\n=== TOTAL vendas Jan-Mai 2026: ${vendas.length} ===\n`);

// distinct fontes
const fontes = {};
for (const v of vendas) fontes[v.fonte||'(vazio)'] = (fontes[v.fonte||'(vazio)']||0)+1;
console.log('Fontes distintas (count):', fontes);
console.log('tipoVenda distintos:', vendas.reduce((a,v)=>{a[v.tipoVenda]=(a[v.tipoVenda]||0)+1;return a;},{}));

// por mês
const meses = {};
for (const v of vendas) {
  const m = mesOf(v);
  meses[m] ??= { n:0, receita:0, comissao:0, kwp:0 };
  meses[m].n++; meses[m].receita += v.valorVenda; meses[m].comissao += v.comissaoTotal; meses[m].kwp += (v.kwp||0);
}
console.log('\n=== Por mês ===');
for (const m of Object.keys(meses).sort()) {
  const x = meses[m];
  console.log(`${m}: ${x.n} vendas | receita R$ ${fmt(x.receita)} | ticket R$ ${fmt(x.receita/x.n)} | comissão R$ ${fmt(x.comissao)} | ${x.kwp.toFixed(1)} kWp`);
}

// fonte x mês (count + receita)
console.log('\n=== Fonte x mês (vendas / receita) ===');
const fm = {};
for (const v of vendas) {
  const m = mesOf(v); const f = v.fonte||'(vazio)';
  fm[f] ??= {};
  fm[f][m] ??= { n:0, r:0 };
  fm[f][m].n++; fm[f][m].r += v.valorVenda;
}
for (const f of Object.keys(fm)) {
  let tot=0, totr=0;
  const cells = ['2026-01','2026-02','2026-03','2026-04','2026-05'].map(m=>{
    const c = fm[f][m]||{n:0,r:0}; tot+=c.n; totr+=c.r;
    return `${m.slice(5)}:${c.n}(${fmt(c.r)})`;
  });
  console.log(`${f.padEnd(18)} | ${cells.join(' | ')} | TOTAL ${tot} / R$ ${fmt(totr)}`);
}

// tipoVenda x mês
console.log('\n=== tipoVenda x mês (INBOUND=tráfego/SDR, EXTERNA=captação própria) ===');
const tm = {};
for (const v of vendas) {
  const m = mesOf(v); const t = v.tipoVenda||'?';
  tm[t] ??= {}; tm[t][m] ??= {n:0,r:0}; tm[t][m].n++; tm[t][m].r+=v.valorVenda;
}
for (const t of Object.keys(tm)) {
  let tot=0,totr=0;
  const cells = ['2026-01','2026-02','2026-03','2026-04','2026-05'].map(m=>{
    const c=tm[t][m]||{n:0,r:0}; tot+=c.n; totr+=c.r; return `${m.slice(5)}:${c.n}`;
  });
  console.log(`${t.padEnd(10)} | ${cells.join(' | ')} | TOTAL ${tot} / R$ ${fmt(totr)}`);
}

await prisma.$disconnect();

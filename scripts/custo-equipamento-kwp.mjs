import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const vendas = await prisma.venda.findMany({
  where: { atipica: false, kwp: { gt: 0 }, custoEquipamentos: { gt: 0 } },
  select: { cliente: true, mesReferencia: true, valorVenda: true, kwp: true, custoEquipamentos: true, over: true },
});

const rows = vendas.map(v => ({
  mes: v.mesReferencia,
  kwp: v.kwp,
  equipPorKwp: v.custoEquipamentos / v.kwp,
  vendaLiqPorKwp: (v.valorVenda - (v.over || 0)) / v.kwp,
  vendaPorKwp: v.valorVenda / v.kwp,
  multiplicador: (v.valorVenda - (v.over || 0)) / v.custoEquipamentos,
}));

const med = arr => { const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
const f = n => n.toLocaleString('pt-BR',{maximumFractionDigits:0});
const f2 = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});

console.log(`vendas válidas (não atípicas): ${rows.length}`);
console.log(`kWp — mediana ${f2(med(rows.map(r=>r.kwp)))} · média ${f2(avg(rows.map(r=>r.kwp)))}`);
console.log(`EQUIPAMENTO R$/kWp — mediana ${f(med(rows.map(r=>r.equipPorKwp)))} · média ${f(avg(rows.map(r=>r.equipPorKwp)))}`);
console.log(`VENDA (sem over) R$/kWp — mediana ${f(med(rows.map(r=>r.vendaLiqPorKwp)))} · média ${f(avg(rows.map(r=>r.vendaLiqPorKwp)))}`);
console.log(`VENDA (cheia) R$/kWp — mediana ${f(med(rows.map(r=>r.vendaPorKwp)))} · média ${f(avg(rows.map(r=>r.vendaPorKwp)))}`);
console.log(`MULTIPLICADOR venda-sem-over / equipamento — mediana ${f2(med(rows.map(r=>r.multiplicador)))} · média ${f2(avg(rows.map(r=>r.multiplicador)))}`);

// por faixa de kWp (residencial vs maior)
for (const [nome, fx] of [['até 4 kWp', r=>r.kwp<=4], ['4–8 kWp', r=>r.kwp>4&&r.kwp<=8], ['8–15 kWp', r=>r.kwp>8&&r.kwp<=15], ['15+ kWp', r=>r.kwp>15]]) {
  const g = rows.filter(fx);
  if (g.length) console.log(`  ${nome} (${g.length}): equip ${f(med(g.map(r=>r.equipPorKwp)))}/kWp · mult ${f2(med(g.map(r=>r.multiplicador)))}`);
}
await prisma.$disconnect();

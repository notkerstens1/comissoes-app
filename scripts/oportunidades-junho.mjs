import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const regs = await prisma.registroSDR.findMany({
  include: { vendedora: true, sdr: true },
});

const inJun = (d) => typeof d === 'string' && d.startsWith('2026-06');

const byRegistro = regs.filter(r => inJun(r.dataRegistro));
const byReuniao = regs.filter(r => inJun(r.dataReuniao));

const agg = (list, key) => {
  const m = {};
  for (const r of list) { const k = key(r) || '—'; m[k] = (m[k]||0)+1; }
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
};

console.log('=== Oportunidades GERADAS em junho/2026 (por dataRegistro):', byRegistro.length, '===');
console.log('Por vendedor:');
for (const [k,v] of agg(byRegistro, r=>r.vendedora?.nome)) console.log(`  ${k}: ${v}`);
console.log('Por origem:');
for (const [k,v] of agg(byRegistro, r=>r.origemRegistro)) console.log(`  ${k}: ${v}`);
console.log('Por SDR:');
for (const [k,v] of agg(byRegistro, r=>r.sdr?.nome)) console.log(`  ${k}: ${v}`);

console.log('\n=== Reunioes agendadas PARA junho (por dataReuniao):', byReuniao.length, '===');
for (const [k,v] of agg(byReuniao, r=>r.vendedora?.nome)) console.log(`  ${k}: ${v}`);

await prisma.$disconnect();

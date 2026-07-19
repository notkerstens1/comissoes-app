import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const rows = await prisma.setorTecnico.findMany({
  where: { ativo: true },
  select: { nomeCliente: true, codigoLocalizador: true, dataVistoria: true, dataInstalacao: true, updatedAt: true },
  orderBy: { updatedAt: 'desc' },
  take: 40,
});

const comVist = rows.filter(r => r.dataVistoria);
const comInst = rows.filter(r => r.dataInstalacao);
console.log(`Total ativos (40 mais recentes): ${rows.length}`);
console.log(`Com dataVistoria: ${comVist.length} | Com dataInstalacao: ${comInst.length}\n`);

console.log('=== cards COM alguma data (mostra valor bruto + formato) ===');
for (const r of rows) {
  if (!r.dataVistoria && !r.dataInstalacao) continue;
  const fmt = v => v ? `"${v}" [${/^\d{4}-\d{2}-\d{2}$/.test(v) ? 'YYYY-MM-DD ok' : v.includes('T') ? 'ISO-com-T!!' : 'OUTRO!!'}]` : '—';
  console.log(`${(r.codigoLocalizador||'—').padEnd(6)} ${r.nomeCliente?.slice(0,22).padEnd(22)}  vist=${fmt(r.dataVistoria)}  inst=${fmt(r.dataInstalacao)}`);
}
await prisma.$disconnect();

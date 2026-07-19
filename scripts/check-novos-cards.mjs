import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const toBR = d => new Date(d).toLocaleString('pt-BR',{timeZone:'America/Recife'});
const DEPLOY = new Date('2026-07-02T15:15:13Z'); // 12:15:13 America/Recife (UTC-3)

for (const [modelo, nome] of [['posVenda','PosVenda'],['setorTecnico','SetorTecnico']]) {
  const rows = await prisma[modelo].findMany({
    where: { ativo: true },
    select: { nomeCliente:true, codigoLocalizador:true, createdAt:true, vendaId:true },
    orderBy: { createdAt: 'desc' }, take: 12,
  });
  console.log(`\n=== ${nome} — 12 mais recentes ===`);
  for (const r of rows) {
    const pos = r.createdAt >= DEPLOY ? 'POS-DEPLOY' : 'pre-deploy';
    console.log(`${(r.codigoLocalizador||'—').padEnd(5)} ${pos.padEnd(11)} ${toBR(r.createdAt)}  ${r.vendaId?'venda':'manual'}  ${r.nomeCliente}`);
  }
}

console.log('\n=== busca Ana Valeska / Jessica Ellen (ambas tabelas) ===');
for (const modelo of ['posVenda','setorTecnico']) {
  const rows = await prisma[modelo].findMany({
    where: { OR:[{nomeCliente:{contains:'Valeska',mode:'insensitive'}},{nomeCliente:{contains:'Jessica',mode:'insensitive'}},{nomeCliente:{contains:'Ellen',mode:'insensitive'}}] },
    select:{nomeCliente:true,codigoLocalizador:true,createdAt:true,vendaId:true},
  });
  for (const r of rows) console.log(`[${modelo}] cod=${r.codigoLocalizador||'—'} ${toBR(r.createdAt)} ${r.vendaId?'venda':'manual'} ${r.nomeCliente}`);
}
await prisma.$disconnect();

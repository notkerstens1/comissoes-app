import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// Usuarios TECNICO (engenheiro)
const users = await prisma.user.findMany({ where: { role: { in: ['TECNICO','POS_VENDA','DIRETOR','ADMIN'] } }, select: { nome:true, role:true, ativo:true } });
console.log('=== usuarios engenharia/gestao ===');
for (const u of users) console.log(`${u.role.padEnd(10)} ${u.ativo?'ativo ':'inativo'} ${u.nome}`);

// Cards de engenharia: quantos com/sem codigo
const tec = await prisma.setorTecnico.findMany({ where: { ativo:true }, select: { codigoLocalizador:true, etapaInstalacao:true, nomeCliente:true } });
const semCod = tec.filter(t=>!t.codigoLocalizador);
console.log(`\n=== SetorTecnico ativos: ${tec.length} | sem codigo: ${semCod.length} | com codigo: ${tec.length-semCod.length}`);

const pos = await prisma.posVenda.findMany({ where: { ativo:true }, select: { codigoLocalizador:true } });
const posSem = pos.filter(p=>!p.codigoLocalizador);
console.log(`=== PosVenda ativos: ${pos.length} | sem codigo: ${posSem.length} | com codigo: ${pos.length-posSem.length}`);

// Existe algum "Albert"?
const albert = tec.filter(t=>/albert/i.test(t.nomeCliente));
console.log('\n=== cards com "Albert":', albert.map(a=>`${a.nomeCliente} [${a.etapaInstalacao}] cod=${a.codigoLocalizador||'—'}`).join(' | ') || 'nenhum');
await prisma.$disconnect();

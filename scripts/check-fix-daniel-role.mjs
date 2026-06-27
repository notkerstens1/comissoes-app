import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const users = await prisma.user.findMany({
  where: { OR: [{ nome: { contains: 'aniel' } }, { email: { contains: 'daniel' } }] },
  select: { id: true, nome: true, email: true, role: true, ativo: true },
});

console.log('Usuarios encontrados:', JSON.stringify(users, null, 2));

const fix = process.argv.includes('--fix');
for (const u of users) {
  if (u.role !== 'VENDEDOR_HIBRIDO') {
    console.log(`\n${u.nome} esta como ${u.role} (esperado VENDEDOR_HIBRIDO).`);
    if (fix) {
      await prisma.user.update({ where: { id: u.id }, data: { role: 'VENDEDOR_HIBRIDO' } });
      console.log(`  -> corrigido para VENDEDOR_HIBRIDO`);
    } else {
      console.log('  (rode com --fix para corrigir)');
    }
  } else {
    console.log(`\n${u.nome} ja esta VENDEDOR_HIBRIDO. OK.`);
  }
}

await prisma.$disconnect();

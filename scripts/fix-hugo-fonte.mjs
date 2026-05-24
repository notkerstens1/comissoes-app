import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const r = await prisma.$executeRawUnsafe(`
  UPDATE "Venda" SET fonte = 'TRAFEGO'
  WHERE id = 'cmpbgz5og000y7rhe5fiylipb'
`);
console.log(`Linhas atualizadas: ${r}`);
const v = await prisma.$queryRawUnsafe(`SELECT id, cliente, fonte FROM "Venda" WHERE id = 'cmpbgz5og000y7rhe5fiylipb'`);
console.log(v);
await prisma.$disconnect();

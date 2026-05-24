import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const v = await prisma.$queryRawUnsafe(`
  SELECT id, cliente, fonte, "dataConversao", "valorVenda"
  FROM "Venda"
  WHERE cliente ILIKE '%HUGO ZACARIAS%' AND "mesReferencia" = '2026-05'
`);
console.log(v);
await prisma.$disconnect();

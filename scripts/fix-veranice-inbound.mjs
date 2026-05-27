// Veranice eh venda real de trafego (Daniel atendeu lead da empresa).
// O backfill anterior marcou como EXTERNA por engano — flipa de volta.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const APPLY = process.env.APPLY === '1';

const v = await prisma.venda.findFirst({
  where: {
    cliente: { contains: 'Veranice', mode: 'insensitive' },
    vendedor: { nome: { contains: 'Daniel', mode: 'insensitive' } },
  },
  select: {
    id: true, cliente: true, dataConversao: true, valorVenda: true,
    margem: true, over: true, fonte: true, tipoVenda: true,
    comissaoVenda: true, comissaoOver: true, comissaoTotal: true,
  },
});

if (!v) { console.error('Veranice nao encontrada'); process.exit(1); }

console.log('Estado atual:');
console.log(v);
console.log();

// Mesma logica do PUT /api/vendas/[id] quando tipoVenda muda: INBOUND usa
// 35% como baseline (recalc mensal ajusta pra faixa progressiva real).
const novaComissaoOver = v.over * 0.35;
const novaComissaoTotal = v.comissaoVenda + novaComissaoOver;
const novo = {
  fonte: 'TRAFEGO',
  tipoVenda: 'INBOUND',
  comissaoOver: novaComissaoOver,
  comissaoTotal: novaComissaoTotal,
  comissaoVendedorCusto: novaComissaoTotal,
};
console.log('Vai mudar pra:', novo);
console.log(`Delta comissao: ${(novaComissaoTotal - v.comissaoTotal).toFixed(2)}`);

if (APPLY) {
  await prisma.venda.update({ where: { id: v.id }, data: novo });
  console.log('OK gravado.');
} else {
  console.log('DRY-RUN. Pra gravar: APPLY=1 node scripts/fix-veranice-inbound.mjs');
}

await prisma.$disconnect();

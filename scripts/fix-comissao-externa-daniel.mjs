// Recalcula comissaoOver e comissaoTotal das vendas EXTERNA do Daniel
// usando a regra correta: over * 50%. Tambem reescreve a fonte pra "EXTERNO".
//
// Dry-run por padrao. Para gravar: APPLY=1 node scripts/fix-comissao-externa-daniel.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const PERCENTUAL_OVER_EXTERNA = 0.5;
const APPLY = process.env.APPLY === '1';

const daniel = await prisma.user.findFirst({
  where: { nome: { contains: 'Daniel', mode: 'insensitive' } },
  select: { id: true, nome: true, role: true },
});

if (!daniel) {
  console.error('Daniel nao encontrado');
  process.exit(1);
}

console.log(`Vendedor: ${daniel.nome} (${daniel.role})`);
console.log(`Modo: ${APPLY ? 'APPLY (vai gravar)' : 'DRY-RUN (so mostra)'}`);
console.log();

const vendas = await prisma.venda.findMany({
  where: { vendedorId: daniel.id, tipoVenda: 'EXTERNA' },
  orderBy: { dataConversao: 'asc' },
});

const fmt = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

let mudancas = 0;
for (const v of vendas) {
  const novaComissaoOver = v.over * PERCENTUAL_OVER_EXTERNA;
  const novaComissaoTotal = v.comissaoVenda + novaComissaoOver;
  const novaFonte = 'EXTERNO';

  const mudouOver = Math.abs((v.comissaoOver ?? 0) - novaComissaoOver) > 0.01;
  const mudouTotal = Math.abs((v.comissaoTotal ?? 0) - novaComissaoTotal) > 0.01;
  const mudouFonte = v.fonte !== novaFonte;

  if (!mudouOver && !mudouTotal && !mudouFonte) {
    console.log(`OK   ${v.dataConversao.toISOString().slice(0, 10)} ${(v.cliente || '').slice(0, 25)} — sem mudanca`);
    continue;
  }

  mudancas++;
  console.log(`FIX  ${v.dataConversao.toISOString().slice(0, 10)} ${(v.cliente || '').slice(0, 30)}`);
  if (mudouFonte) console.log(`     fonte:        "${v.fonte}" -> "${novaFonte}"`);
  if (mudouOver) console.log(`     comissaoOver: ${fmt(v.comissaoOver)} -> ${fmt(novaComissaoOver)}`);
  if (mudouTotal) console.log(`     comissaoTotal:${fmt(v.comissaoTotal)} -> ${fmt(novaComissaoTotal)}`);

  if (APPLY) {
    await prisma.venda.update({
      where: { id: v.id },
      data: {
        fonte: novaFonte,
        comissaoOver: novaComissaoOver,
        comissaoTotal: novaComissaoTotal,
        comissaoVendedorCusto: novaComissaoTotal,
      },
    });
  }
}

console.log();
console.log(`${mudancas} venda(s) afetada(s).`);
if (!APPLY && mudancas > 0) {
  console.log('Para gravar: APPLY=1 node scripts/fix-comissao-externa-daniel.mjs');
}

await prisma.$disconnect();

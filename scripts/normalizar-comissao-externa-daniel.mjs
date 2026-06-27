// Normaliza comissao de TODAS as vendas EXTERNA do Daniel:
// - cVenda = valor * 2.5% (limpa percentualComissaoOverride)
// - over = max(valor - custoEquip*1.8, 0) se margem >= 1.8, senao 0 (respeita excecao)
// - cOver = over * 50%
// - cTotal = cVenda + cOver
//
// Idempotente. Dry-run por padrao.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const APPLY = process.env.APPLY === '1';
const TAXA_COMISSAO_VENDA = 0.025;
const TAXA_OVER_EXTERNA = 0.5;
const FATOR_MARGEM_MINIMA = 1.8;

const d = await prisma.user.findFirst({ where: { email: 'daniel@solar.com' } });
const vendas = await prisma.venda.findMany({
  where: { vendedorId: d.id, tipoVenda: 'EXTERNA' },
  orderBy: { dataConversao: 'asc' },
});

const fmt = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

let totalDelta = 0;
let mudancas = 0;
for (const v of vendas) {
  const overCalc = v.custoEquipamentos > 0
    ? Math.max(v.valorVenda - v.custoEquipamentos * FATOR_MARGEM_MINIMA, 0)
    : 0;
  const margemReal = v.custoEquipamentos > 0 ? v.valorVenda / v.custoEquipamentos : 0;
  // Se margem < 1.8 e nao tem excecao, over = 0
  const novoOver = (margemReal < FATOR_MARGEM_MINIMA && !v.excecao) ? 0 : overCalc;
  const novaComissaoVenda = v.valorVenda * TAXA_COMISSAO_VENDA;
  const novaComissaoOver = novoOver * TAXA_OVER_EXTERNA;
  const novaComissaoTotal = novaComissaoVenda + novaComissaoOver;

  const mudouOverride = v.percentualComissaoOverride !== null;
  const mudouOver = Math.abs((v.over ?? 0) - novoOver) > 0.01;
  const mudouCVenda = Math.abs((v.comissaoVenda ?? 0) - novaComissaoVenda) > 0.01;
  const mudouCOver = Math.abs((v.comissaoOver ?? 0) - novaComissaoOver) > 0.01;

  if (!mudouOverride && !mudouOver && !mudouCVenda && !mudouCOver) {
    console.log(`OK   ${(v.cliente || '').slice(0,30).padEnd(30)} — ja conforme`);
    continue;
  }

  mudancas++;
  const delta = novaComissaoTotal - v.comissaoTotal;
  totalDelta += delta;
  console.log(`FIX  ${(v.cliente || '').slice(0,30).padEnd(30)}`);
  if (mudouOverride) console.log(`     override:  ${v.percentualComissaoOverride} -> null (usa padrao 2.5%)`);
  if (mudouOver)     console.log(`     over:      ${fmt(v.over)} -> ${fmt(novoOver)}`);
  if (mudouCVenda)   console.log(`     cVenda:    ${fmt(v.comissaoVenda)} -> ${fmt(novaComissaoVenda)}`);
  if (mudouCOver)    console.log(`     cOver:     ${fmt(v.comissaoOver)} -> ${fmt(novaComissaoOver)}`);
  console.log(`     cTotal:    ${fmt(v.comissaoTotal)} -> ${fmt(novaComissaoTotal)}   (delta: ${delta >= 0 ? '+' : ''}${fmt(delta)})`);

  if (APPLY) {
    await prisma.venda.update({
      where: { id: v.id },
      data: {
        percentualComissaoOverride: null,
        over: novoOver,
        comissaoVenda: novaComissaoVenda,
        comissaoOver: novaComissaoOver,
        comissaoTotal: novaComissaoTotal,
        comissaoVendedorCusto: novaComissaoTotal,
      },
    });
  }
}

console.log();
console.log(`${mudancas} venda(s) afetada(s). Delta total: ${totalDelta >= 0 ? '+' : ''}${fmt(totalDelta)}`);
if (!APPLY && mudancas > 0) {
  console.log('Pra gravar: APPLY=1 node scripts/normalizar-comissao-externa-daniel.mjs');
}

await prisma.$disconnect();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const ID = 'cmqwno8fl0001n86xdmkjfja5'; // Andre da Silva Lima — Bruna Lays — 2026-06
const NOVA_MARGEM = 1.65;

const v = await prisma.venda.findUnique({ where: { id: ID }, include: { vendedor: { select: { nome: true } } } });
if (!v) { console.error('Venda nao encontrada'); process.exit(1); }
if (v.cliente !== 'Andre da Silva Lima') { console.error('Cliente inesperado:', v.cliente); process.exit(1); }

// ── Espelha o bloco novaMargem + excecao do PUT /api/vendas/[id] ──
const overBruto = Math.max(v.valorVenda - v.custoEquipamentos * NOVA_MARGEM, 0);
const excecao = true;
const over = (NOVA_MARGEM < 1.8 && !excecao) ? 0 : overBruto;
const percentualOver = v.tipoVenda === 'EXTERNA' ? 0.5 : 0.35;
const comissaoOver = over * percentualOver;
const comissaoVenda = v.valorVenda * (v.percentualComissaoOverride ?? 0.025);
const novaComissaoTotal = comissaoOver + comissaoVenda;

const outrosCustos =
  (v.custoInstalacao ?? 0) + (v.custoVisitaTecnica ?? 0) + (v.custoCosern ?? 0) +
  (v.custoTrtCrea ?? 0) + (v.custoEngenheiro ?? 0) + (v.custoMaterialCA ?? 0) + (v.custoImposto ?? 0);
const novoLucro = v.valorVenda - v.custoEquipamentos - outrosCustos - novaComissaoTotal;
const novaMargemLucro = v.valorVenda > 0 ? novoLucro / v.valorVenda : 0;

// historico
const historico = v.historicoAlteracoes ? JSON.parse(v.historicoAlteracoes) : [];
historico.push({
  usuario: 'Erick (Diretor)',
  role: 'DIRETOR',
  data: new Date().toISOString(),
  alteracoes: [
    { campo: 'over', de: v.over, para: over },
    { campo: 'comissaoOver', de: v.comissaoOver, para: comissaoOver },
    { campo: 'comissaoTotal', de: v.comissaoTotal, para: novaComissaoTotal },
    { campo: 'excecao', de: v.excecao, para: true },
  ],
  motivo: 'Excecao de margem concedida (1,65x). Over nao foi aplicado no fechamento da venda — ajuste retroativo.',
});

console.log('ANTES :', { over: v.over, comissaoOver: v.comissaoOver, comissaoTotal: v.comissaoTotal, excecao: v.excecao, lucroLiquido: v.lucroLiquido });
console.log('DEPOIS:', { over, comissaoOver, comissaoTotal: novaComissaoTotal, excecao: true, lucroLiquido: novoLucro });

await prisma.venda.update({
  where: { id: ID },
  data: {
    margem: NOVA_MARGEM,
    over,
    comissaoOver,
    comissaoVenda,
    comissaoTotal: novaComissaoTotal,
    comissaoVendedorCusto: novaComissaoTotal,
    excecao: true,
    lucroLiquido: novoLucro,
    margemLucroLiquido: novaMargemLucro,
    historicoAlteracoes: JSON.stringify(historico),
  },
});

const after = await prisma.venda.findUnique({ where: { id: ID } });
console.log('\n── CONFIRMACAO (releitura) ──');
console.log('over         :', after.over);
console.log('comissaoOver :', after.comissaoOver, `(${(percentualOver*100)}% sobre over)`);
console.log('comissaoVenda:', after.comissaoVenda);
console.log('comissaoTotal:', after.comissaoTotal);
console.log('excecao      :', after.excecao);
await prisma.$disconnect();

// Seed idempotente dos precos de material e custos de deslocamento.
// Cria os defaults se nao existirem; NAO sobrescreve valores ja editados via admin.
//
// Como rodar (em prod):
//   node --env-file=.env.production.local scripts/seed-precos-instalacao.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const precos = [
  { chave: 'CABO_6MM',         label: 'Cabo 6mm',         precoUnit: 5.00,  unidade: 'm'  },
  { chave: 'CABO_10MM',        label: 'Cabo 10mm',        precoUnit: 9.90,  unidade: 'm'  },
  { chave: 'ELETRODUTO_MEIA',  label: 'Eletroduto 1/2',   precoUnit: 8.00,  unidade: 'un' },
  { chave: 'ELETRODUTO_UMA',   label: 'Eletroduto 1 pol', precoUnit: 12.00, unidade: 'un' },
  { chave: 'DPS',              label: 'DPS',              precoUnit: 80.00, unidade: 'un' },
  { chave: 'DISJUNTOR',        label: 'Disjuntor',        precoUnit: 35.00, unidade: 'un' },
  { chave: 'QUADRO',           label: 'Quadro',           precoUnit: 90.00, unidade: 'un' },
];

for (const p of precos) {
  await prisma.precoMaterial.upsert({
    where: { chave: p.chave },
    update: { label: p.label, unidade: p.unidade }, // mantem precoUnit se ja foi editado
    create: p,
  });
  console.log(`PrecoMaterial ${p.chave} ok`);
}

const deslocamentos = [
  { cidade: 'Natal',      valor: 0   },
  { cidade: 'Parnamirim', valor: 30  },
  { cidade: 'Macaiba',    valor: 50  },
  { cidade: 'Mossoro',    valor: 300 },
];

for (const d of deslocamentos) {
  await prisma.custoDeslocamento.upsert({
    where: { cidade: d.cidade },
    update: {}, // mantem valor se ja foi editado
    create: d,
  });
  console.log(`CustoDeslocamento ${d.cidade} ok`);
}

console.log('\nPronto. Pedro/diretor pode afinar via /admin/precos-instalacao.');

await prisma.$disconnect();

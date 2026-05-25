// Backfill one-shot: separa o campo legado `etapa` em dois trilhos
// (`etapa` = PROJETO, `etapaInstalacao` = INSTALACAO).
//
// Cenarios:
//   1. Card em etapa de PROJETO (NOVO_PROJETO..PROJETO_APROVADO)
//      -> mantem `etapa` como esta, define `etapaInstalacao = AGENDAR_VISITA`
//   2. Card em etapa de INSTALACAO (VISITA_AGENDADA..REDE_LIGADA)
//      -> assume que projeto ja foi aprovado, move pra dois trilhos:
//         `etapa = PROJETO_APROVADO`, `etapaInstalacao = <etapa atual>`
//
// O default do schema ja cobre cenario 1 pra cards novos. Este script eh
// pra cards que ja existiam antes do db push aplicar o novo schema.
//
// Como rodar:
//   cd /Users/ERICK/PROJETOS/comissoes-app
//   cp .env.production.local .env.production.local.bkp  # se nao tiver
//   node --env-file=.env.production.local scripts/backfill-etapa-instalacao.mjs
//
// IDEMPOTENTE: roda quantas vezes quiser. So mexe em cards onde a etapa
// atual aponta pra INSTALACAO mas o trilho de instalacao ainda esta no
// default AGENDAR_VISITA (sinal de que nunca foi migrado).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const ETAPAS_INSTALACAO_KEYS = [
  "VISITA_AGENDADA",
  "VISITA_FEITA",
  "AGUARDANDO_MATERIAL",
  "MATERIAL_COMPRADO",
  "INSTALACAO_AGENDADA",
  "INSTALACAO_CONCLUIDA",
  "REDE_LIGADA",
];

const cards = await prisma.setorTecnico.findMany({
  where: {
    etapa: { in: ETAPAS_INSTALACAO_KEYS },
    etapaInstalacao: "AGENDAR_VISITA", // ainda no default = nao foi migrado
  },
  select: { id: true, nomeCliente: true, etapa: true },
});

console.log(`Cards a migrar: ${cards.length}`);

let count = 0;
for (const c of cards) {
  await prisma.setorTecnico.update({
    where: { id: c.id },
    data: {
      etapa: "PROJETO_APROVADO",
      etapaInstalacao: c.etapa,
    },
  });
  count++;
  console.log(`  ${c.nomeCliente} -> projeto=PROJETO_APROVADO, instalacao=${c.etapa}`);
}

console.log(`\nMigrados: ${count} cards`);
await prisma.$disconnect();

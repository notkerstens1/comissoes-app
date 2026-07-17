import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

function norm(name) {
  return (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ');
}

// Oportunidades abertas (nao vinculadas) que JA tem venda do mesmo vendedor+cliente
const abertas = await prisma.registroSDR.findMany({
  where: { vendaVinculadaId: null, statusLead: { in: ['AGENDADO', 'COMPARECEU'] } },
  select: { id: true, nomeCliente: true, statusLead: true, origemRegistro: true, compareceu: true, dataReuniao: true, vendedoraId: true, vendedora: { select: { nome: true } }, sdr: { select: { nome: true } } },
});

const travadas = [];
for (const r of abertas) {
  const venda = await prisma.venda.findFirst({
    where: { vendedorId: r.vendedoraId },
    select: { id: true, cliente: true, fonte: true, tipoVenda: true, dataConversao: true },
    orderBy: { dataConversao: 'desc' },
  });
  // procura venda com mesmo nome normalizado desse vendedor
  const vendasDoVend = await prisma.venda.findMany({
    where: { vendedorId: r.vendedoraId },
    select: { id: true, cliente: true, fonte: true, tipoVenda: true, dataConversao: true, statusContrato: true },
  });
  const match = vendasDoVend.find((v) => norm(v.cliente) === norm(r.nomeCliente));
  if (match) travadas.push({ r, v: match });
}

console.log(`Oportunidades abertas (nao vinculadas): ${abertas.length}`);
console.log(`TRAVADAS (tem venda criada mas oportunidade segue aberta): ${travadas.length}\n`);
for (const { r, v } of travadas) {
  console.log(`• ${r.nomeCliente}  [${r.vendedora?.nome}]`);
  console.log(`   oportunidade: origem=${r.origemRegistro} status=${r.statusLead} sdr=${r.sdr?.nome ?? '—'} compareceu=${r.compareceu} reuniao=${r.dataReuniao}`);
  console.log(`   venda: fonte=${v.fonte} tipo=${v.tipoVenda} conversao=${v.dataConversao.toISOString().split('T')[0]}`);
  console.log(`   → SDR a creditar? ${r.origemRegistro === 'SDR' ? 'SIM (' + (r.sdr?.nome ?? '?') + ')' : 'não (prospecção própria)'}`);
}

await prisma.$disconnect();

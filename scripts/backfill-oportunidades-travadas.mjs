import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const COMISSAO_VENDA_SDR = 20;
function norm(name) {
  return (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ');
}
const comissaoVendaPorOrigem = (o) => (o === 'VENDEDOR' ? 0 : COMISSAO_VENDA_SDR);

// Mesma deteccao do diagnostico: oportunidades abertas com venda ja criada.
const abertas = await prisma.registroSDR.findMany({
  where: { vendaVinculadaId: null, statusLead: { in: ['AGENDADO', 'COMPARECEU'] } },
  select: { id: true, nomeCliente: true, statusLead: true, origemRegistro: true, comissaoReuniao: true, vendedoraId: true, vendedora: { select: { nome: true } }, sdr: { select: { nome: true } } },
});

let corrigidas = 0;
for (const r of abertas) {
  const vendas = await prisma.venda.findMany({
    where: { vendedorId: r.vendedoraId },
    select: { id: true, cliente: true, dataConversao: true },
  });
  const venda = vendas.find((v) => norm(v.cliente) === norm(r.nomeCliente));
  if (!venda) continue; // aberta de verdade, sem venda — nao mexer

  // Trava: nao religar uma venda ja vinculada a outro registro
  const jaLigada = await prisma.registroSDR.findFirst({ where: { vendaVinculadaId: venda.id } });
  if (jaLigada) {
    console.log(`SKIP ${r.nomeCliente}: venda ${venda.id} ja vinculada ao registro ${jaLigada.id}`);
    continue;
  }

  const dataVinculo = new Date(venda.dataConversao).toISOString().split('T')[0];
  const comissaoVenda = comissaoVendaPorOrigem(r.origemRegistro);
  const comissaoTotal = r.comissaoReuniao + comissaoVenda;

  console.log(`\n• ${r.nomeCliente} [${r.vendedora?.nome}]`);
  console.log(`   ANTES: statusLead=${r.statusLead} vinculadaId=null comissaoVenda=—`);
  console.log(`   origem=${r.origemRegistro} sdr=${r.sdr?.nome ?? '—'} → comissaoVenda=R$${comissaoVenda} comissaoTotal=R$${comissaoTotal}`);

  await prisma.registroSDR.update({
    where: { id: r.id },
    data: {
      vendaVinculadaId: venda.id,
      dataVendaVinculada: dataVinculo,
      comissaoVenda,
      comissaoTotal,
      statusLead: 'VENDIDO',
    },
  });
  console.log(`   DEPOIS: statusLead=VENDIDO vinculadaId=${venda.id} ✅`);
  corrigidas++;
}

console.log(`\n=== ${corrigidas} oportunidade(s) corrigida(s) ===`);
await prisma.$disconnect();

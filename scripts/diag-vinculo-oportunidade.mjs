import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

function norm(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

const JANELA = 60;

// Daniel (vendedor do print)
const daniel = await prisma.user.findFirst({ where: { email: 'daniel@solar.com' } });
console.log('Vendedor:', daniel?.nome, daniel?.id);

// Ultimas vendas do Daniel
const vendas = await prisma.venda.findMany({
  where: { vendedorId: daniel.id },
  orderBy: { dataConversao: 'desc' },
  take: 8,
  select: { id: true, cliente: true, fonte: true, tipoVenda: true, dataConversao: true, createdAt: true },
});

for (const v of vendas) {
  const origemEsperada = (v.fonte === 'INDICACAO' || v.fonte === 'FOLLOWUP') ? 'VENDEDOR' : 'SDR';
  const dc = new Date(v.dataConversao);
  const li = new Date(dc); li.setDate(li.getDate() - JANELA);
  const liStr = li.toISOString().split('T')[0];
  const dcStr = dc.toISOString().split('T')[0];

  // RegistroSDR do mesmo cliente (por nome normalizado), qualquer estado
  const regs = await prisma.registroSDR.findMany({
    where: { vendedoraId: daniel.id },
    select: { id: true, nomeCliente: true, compareceu: true, origemRegistro: true, dataReuniao: true, vendaVinculadaId: true, statusLead: true },
  });
  const mesmoNome = regs.filter((r) => norm(r.nomeCliente) === norm(v.cliente));

  console.log('\n────────────────────────────────────────');
  console.log('VENDA:', v.cliente);
  console.log('  fonte:', v.fonte, '| tipoVenda:', v.tipoVenda, '| origemEsperada:', origemEsperada);
  console.log('  dataConversao:', dcStr, '| janela:', liStr, '→', dcStr);
  if (mesmoNome.length === 0) {
    console.log('  ⚠️  NENHUM RegistroSDR com esse nome (normalizado) pra esse vendedor');
  }
  for (const r of mesmoNome) {
    const dataOk = r.dataReuniao >= liStr && r.dataReuniao <= dcStr;
    const criterios = {
      compareceu: r.compareceu,
      origemBate: r.origemRegistro === origemEsperada,
      naoVinculado: r.vendaVinculadaId === null,
      dataNaJanela: dataOk,
    };
    const casaria = criterios.compareceu && criterios.origemBate && criterios.naoVinculado && criterios.dataNaJanela;
    console.log('  OPORTUNIDADE:', r.nomeCliente, '| statusLead:', r.statusLead);
    console.log('    origemRegistro:', r.origemRegistro, '| compareceu:', r.compareceu, '| dataReuniao:', r.dataReuniao, '| vinculadaId:', r.vendaVinculadaId);
    console.log('    critérios →', JSON.stringify(criterios), casaria ? '✅ CASARIA' : '❌ NÃO CASA');
  }
}

await prisma.$disconnect();

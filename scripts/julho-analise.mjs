import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const fmt = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DE = '2026-07-01', ATE = '2026-07-17';

// ===== VENDAS (dataConversao 01-17 jul) =====
const vendas = await prisma.venda.findMany({
  where: {
    dataConversao: { gte: new Date('2026-07-01T00:00:00-03:00'), lt: new Date('2026-07-18T00:00:00-03:00') },
  },
  include: { vendedor: { select: { nome: true } }, registrosSDR: { select: { sdr: { select: { nome: true } } } } },
  orderBy: { dataConversao: 'asc' },
});

let receita = 0, kwp = 0;
const porVendedor = {}, porFonte = {};
for (const v of vendas) {
  receita += v.valorVenda; kwp += v.kwp;
  porVendedor[v.vendedor.nome] = (porVendedor[v.vendedor.nome] || 0) + 1;
  porFonte[v.fonte || 'sem_fonte'] = (porFonte[v.fonte || 'sem_fonte'] || 0) + 1;
}
console.log('===== VENDAS (dataConversao 01-17/07) =====');
console.log(`Total: ${vendas.length} | Receita: R$ ${fmt(receita)} | Ticket: R$ ${fmt(vendas.length ? receita/vendas.length : 0)} | kWp: ${kwp.toFixed(2)}`);
console.log('Por vendedor:', porVendedor);
console.log('Por fonte:', porFonte);
console.log('--- detalhe ---');
for (const v of vendas) {
  const sdr = v.registrosSDR?.[0]?.sdr?.nome || '—';
  const data = v.dataConversao.toISOString().slice(0,10);
  console.log(`${data} | ${(v.cliente||'').slice(0,28).padEnd(28)} | R$ ${fmt(v.valorVenda).padStart(12)} | ${(v.vendedor.nome||'').slice(0,10).padEnd(10)} | ${(v.fonte||'—').padEnd(10)} | SDR:${sdr.slice(0,10)}`);
}

// ===== REGISTRO SDR (dataRegistro 01-17 jul) =====
const regs = await prisma.registroSDR.findMany({
  where: { dataRegistro: { gte: DE, lte: ATE } },
  include: { sdr: { select: { nome: true } }, vendedora: { select: { nome: true } } },
});
console.log('\n===== REGISTROS SDR (dataRegistro 01-17/07) =====');
console.log(`Total registros: ${regs.length}`);
const sdrPor = {}, statusPor = {}, compareceu = { sim:0, nao:0 };
let comVenda = 0;
for (const r of regs) {
  const nome = r.sdr?.nome || '—';
  sdrPor[nome] = sdrPor[nome] || { total:0, compareceu:0, vendido:0 };
  sdrPor[nome].total++;
  if (r.compareceu) { sdrPor[nome].compareceu++; compareceu.sim++; } else compareceu.nao++;
  if (r.vendaVinculadaId) { sdrPor[nome].vendido++; comVenda++; }
  statusPor[r.statusLead] = (statusPor[r.statusLead]||0)+1;
}
console.log('Por SDR (total/compareceu/vendido):', JSON.stringify(sdrPor));
console.log('Por statusLead:', statusPor);
console.log(`Compareceu: ${compareceu.sim} | Não: ${compareceu.nao} | Com venda vinculada: ${comVenda}`);

// ===== DAILY TRAFFIC (01-17 jul) =====
const traffic = await prisma.dailyTraffic.findMany({ where: { data: { gte: DE, lte: ATE } }, orderBy: { data: 'asc' } });
let tSpend=0, tLeads=0, tReach=0, tVendas=0, tBranding=0;
for (const t of traffic) { tSpend+=t.valorGasto; tLeads+=t.totalLeads; tReach+=t.pessoasAlcancadas; tVendas+=t.valorInvestidoVendas; tBranding+=t.valorInvestidoBranding; }
console.log('\n===== DAILY TRAFFIC (01-17/07) =====');
console.log(`Dias com registro: ${traffic.length} | Gasto total: R$ ${fmt(tSpend)} | Leads: ${tLeads} | Alcance: ${tReach}`);
console.log(`Invest. vendas: R$ ${fmt(tVendas)} | Invest. branding: R$ ${fmt(tBranding)}`);
console.log(`CPL (gasto/leads): R$ ${fmt(tLeads ? tSpend/tLeads : 0)}`);

// ===== META ADS CAMPAIGN (01-17 jul) =====
const meta = await prisma.metaAdsCampaign.findMany({ where: { data: { gte: DE, lte: ATE } } });
let mSpend=0, mLeads=0, mImpr=0, mReach=0, mClicks=0, mMsg=0;
const porCamp = {};
for (const m of meta) {
  mSpend+=m.spend; mLeads+=m.leads; mImpr+=m.impressions; mReach+=m.reach; mClicks+=m.clicks; mMsg+=m.messages;
  porCamp[m.campaignName] = porCamp[m.campaignName] || { spend:0, leads:0 };
  porCamp[m.campaignName].spend += m.spend; porCamp[m.campaignName].leads += m.leads;
}
console.log('\n===== META ADS (banco, 01-17/07) =====');
console.log(`Rows: ${meta.length} | Spend: R$ ${fmt(mSpend)} | Leads: ${mLeads} | Msgs: ${mMsg} | Impr: ${mImpr} | Alcance: ${mReach} | Clicks: ${mClicks}`);
console.log(`CPL: R$ ${fmt(mLeads ? mSpend/mLeads : 0)}`);
console.log('Por campanha:'); for (const [k,v] of Object.entries(porCamp)) console.log(`  ${k}: R$ ${fmt(v.spend)} / ${v.leads} leads`);

// ===== DAILY COMMERCIAL (01-17 jul) =====
const com = await prisma.dailyCommercial.findMany({ where: { data: { gte: DE, lte: ATE } }, include: { vendedor: { select: { nome: true } } } });
let cAt=0, cMql=0, cReu=0, cProp=0, cFech=0, cVal=0, cDesc=0;
for (const c of com) { cAt+=c.atendidos; cMql+=c.mql; cReu+=c.reunioes; cProp+=c.propostas; cFech+=c.fechados; cVal+=c.valorEmVendas; cDesc+=c.leadsDescartados; }
console.log('\n===== DAILY COMMERCIAL (01-17/07) =====');
console.log(`Rows: ${com.length} | Atendidos: ${cAt} | MQL: ${cMql} | Reuniões: ${cReu} | Propostas: ${cProp} | Fechados: ${cFech} | Descartados: ${cDesc} | Valor: R$ ${fmt(cVal)}`);

await prisma.$disconnect();

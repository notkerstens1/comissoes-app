import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const DRY = process.argv.includes('--dry');

function gerarCodigo4(){ return String(Math.floor(Math.random()*10000)).padStart(4,'0'); }

// Conjunto de códigos já em uso (nenhum hoje, mas checa por segurança) + os que
// formos atribuindo nesta rodada, pra garantir unicidade global.
const usados = new Set();
async function precarregarUsados(){
  for (const m of ['setorTecnico','posVenda']){
    const rows = await prisma[m].findMany({ where: { codigoLocalizador: { not: null } }, select: { codigoLocalizador: true } });
    rows.forEach(r => usados.add(r.codigoLocalizador));
  }
}
function novoCodigoUnico(){
  for (let i=0;i<200;i++){ const c=gerarCodigo4(); if(!usados.has(c)){ usados.add(c); return c; } }
  throw new Error('espaco de codigos saturado');
}

await precarregarUsados();

const tec = await prisma.setorTecnico.findMany({ where: { ativo:true }, select: { id:true, vendaId:true, codigoLocalizador:true, nomeCliente:true } });
const pos = await prisma.posVenda.findMany({ where: { ativo:true }, select: { id:true, vendaId:true, codigoLocalizador:true, nomeCliente:true } });

// 1) Agrupar por vendaId (mesmo cliente dos dois lados => mesmo codigo)
const porVenda = new Map(); // vendaId -> codigo
function codigoDaVenda(vendaId){
  if(!porVenda.has(vendaId)) porVenda.set(vendaId, novoCodigoUnico());
  return porVenda.get(vendaId);
}

const updates = []; // {modelo,id,codigo,nome}
for (const r of tec){
  if (r.codigoLocalizador) continue; // ja tem — nao mexe
  const codigo = r.vendaId ? codigoDaVenda(r.vendaId) : novoCodigoUnico();
  updates.push({ modelo:'setorTecnico', id:r.id, codigo, nome:r.nomeCliente });
}
for (const r of pos){
  if (r.codigoLocalizador) continue;
  const codigo = r.vendaId ? codigoDaVenda(r.vendaId) : novoCodigoUnico();
  updates.push({ modelo:'posVenda', id:r.id, codigo, nome:r.nomeCliente });
}

console.log(`SetorTecnico ativos: ${tec.length} | PosVenda ativos: ${pos.length}`);
console.log(`Cards a receber codigo: ${updates.length} | vendas compartilhadas: ${porVenda.size}`);
// Amostra de compartilhamento (mesma venda, mesmo codigo nos dois lados)
const amostra = tec.filter(t=>t.vendaId && porVenda.has(t.vendaId)).slice(0,3);
for (const t of amostra){ const p = pos.find(x=>x.vendaId===t.vendaId); console.log(`  venda ${t.vendaId.slice(-6)} -> codigo ${porVenda.get(t.vendaId)} | tec:${t.nomeCliente}${p?` | pos:${p.nomeCliente}`:''}`); }

if (DRY){ console.log('\n[DRY-RUN] nada foi escrito.'); await prisma.$disconnect(); process.exit(0); }

let n=0;
for (const u of updates){ await prisma[u.modelo].update({ where:{id:u.id}, data:{ codigoLocalizador:u.codigo } }); n++; }
console.log(`\nEscrito: ${n} cards atualizados.`);

// Confirmacao: nenhum card ativo sem codigo
const semTec = await prisma.setorTecnico.count({ where: { ativo:true, codigoLocalizador:null } });
const semPos = await prisma.posVenda.count({ where: { ativo:true, codigoLocalizador:null } });
console.log(`Restam sem codigo -> SetorTecnico: ${semTec} | PosVenda: ${semPos}`);
await prisma.$disconnect();

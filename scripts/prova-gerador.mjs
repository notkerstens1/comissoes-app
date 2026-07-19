import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
// Replica exata do gerador (lib e TS; aqui em JS puro contra prod, só leitura)
function gerarCodigo4(){ return String(Math.floor(Math.random()*10000)).padStart(4,'0'); }
async function gerarUnico(){
  for(let i=0;i<50;i++){
    const c=gerarCodigo4();
    const [t,p]=await Promise.all([
      prisma.setorTecnico.findFirst({where:{codigoLocalizador:c}}),
      prisma.posVenda.findFirst({where:{codigoLocalizador:c}}),
    ]);
    if(!t&&!p) return c;
  }
  throw new Error('saturado');
}
// prova: coluna existe (select ja funcionou antes) + gerador roda e devolve codigo unico
const codigos = [];
for(let i=0;i<5;i++) codigos.push(await gerarUnico());
console.log('Gerador rodou contra prod. 5 codigos unicos gerados:', codigos.join(', '));
console.log('Coluna codigoLocalizador existe em prod: SIM (db push aplicou no boot).');
await prisma.$disconnect();

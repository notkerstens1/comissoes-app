// Tag curta (4 digitos) que identifica um cliente e e compartilhada entre o
// card de pos-venda e o de engenharia. Gerada com checagem de colisao pra
// garantir que dois clientes ativos nunca compartilhem o mesmo numero.

type PrismaLike = {
  setorTecnico: { findFirst: (args: { where: { codigoLocalizador: string } }) => Promise<{ id: string } | null> };
  posVenda: { findFirst: (args: { where: { codigoLocalizador: string } }) => Promise<{ id: string } | null> };
};

export function gerarCodigo4(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export async function gerarCodigoLocalizadorUnico(prisma: PrismaLike): Promise<string> {
  const MAX = 50;
  for (let tentativa = 0; tentativa < MAX; tentativa++) {
    const candidato = gerarCodigo4();
    const [emTec, emPos] = await Promise.all([
      prisma.setorTecnico.findFirst({ where: { codigoLocalizador: candidato } }),
      prisma.posVenda.findFirst({ where: { codigoLocalizador: candidato } }),
    ]);
    if (!emTec && !emPos) return candidato;
  }
  throw new Error("Nao foi possivel gerar codigo localizador unico (base saturada)");
}

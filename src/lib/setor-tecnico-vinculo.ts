// Vinculo entre o card de Pos-Venda e o card do Setor Tecnico.
//
// Os dois cards nascem juntos quando a venda e fechada (ver /api/vendas) e
// compartilham o mesmo `vendaId` e o mesmo `codigoLocalizador`. O endereco da
// geradora e uma so informacao (fonte de verdade: SetorTecnico.enderecoInstalacao);
// o card de pos-venda le/grava esse mesmo campo via este vinculo, pra ninguem
// precisar digitar o endereco duas vezes.

type CardChave = {
  vendaId?: string | null;
  codigoLocalizador?: string | null;
};

type SetorChaveavel = {
  vendaId: string | null;
  codigoLocalizador: string | null;
};

/**
 * Acha o card do Setor Tecnico vinculado a um card de pos-venda.
 * Prefere o casamento por `vendaId` (chave forte, unica) e cai no
 * `codigoLocalizador` quando o card nao tem venda vinculada. Retorna null se
 * nada casar.
 */
export function matchSetorTecnicoVinculado<T extends SetorChaveavel>(
  card: CardChave,
  setores: T[],
): T | null {
  if (card.vendaId) {
    const porVenda = setores.find((s) => !!s.vendaId && s.vendaId === card.vendaId);
    if (porVenda) return porVenda;
  }
  if (card.codigoLocalizador) {
    const porCodigo = setores.find(
      (s) => !!s.codigoLocalizador && s.codigoLocalizador === card.codigoLocalizador,
    );
    if (porCodigo) return porCodigo;
  }
  return null;
}

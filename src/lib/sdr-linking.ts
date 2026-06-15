// ============================================================
// SDR: Motor de vinculo automatico Venda ↔ RegistroSDR
// ============================================================

import { prisma } from "./prisma";
import { normalizeClientName, COMISSAO_VENDA_SDR, JANELA_VINCULO_DIAS } from "./sdr";

/**
 * Tenta vincular uma venda recem-criada a um RegistroSDR existente.
 *
 * Criterios de match:
 * 1. Nome do cliente (normalizado) identico
 * 2. Vendedora (vendedoraId) identica ao vendedorId da venda
 * 3. Data da reuniao dentro da janela (dataConversao - 60 dias)
 * 4. Compareceu = true
 * 5. Ainda nao vinculado a outra venda
 *
 * Resultados:
 * - 0 matches → nada (venda sem SDR)
 * - 1 match  → vinculo automatico + comissao R$20
 * - >1 match → cria PendenciaVinculo para supervisor/diretor resolver
 */
export async function tentarVincularVendaSDR(vendaId: string): Promise<void> {
  try {
    // 1. Buscar a venda
    const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
    if (!venda) return;

    // Vendas EXTERNAS (captacao propria do vendedor hibrido) nao passam pela SDR
    if (venda.tipoVenda === "EXTERNA") return;

    // Regra de canal:
    //  - INDICACAO  = fluxo direto do vendedor (ele ligou/qualificou). NUNCA
    //                 passou pela SDR. So casa com a oportunidade que o proprio
    //                 vendedor criou (origemRegistro=VENDEDOR) e NAO paga SDR.
    //  - FOLLOWUP   = lead que veio do trafego mas o vendedor assumiu apos o
    //                 followup inicial. NAO passa pela SDR — casa com a
    //                 oportunidade do proprio vendedor e NAO paga comissao SDR.
    //  - TRAFEGO    = lead da empresa qualificado pela SDR (origemRegistro=SDR),
    //                 paga comissao SDR normal.
    const origemEsperada =
      venda.fonte === "INDICACAO" || venda.fonte === "FOLLOWUP" ? "VENDEDOR" : "SDR";

    // 2. Normalizar nome do cliente
    const nomeNormalizado = normalizeClientName(venda.cliente);

    // 3. Calcular janela de datas
    const dataConversao = new Date(venda.dataConversao);
    const limiteInferior = new Date(dataConversao);
    limiteInferior.setDate(limiteInferior.getDate() - JANELA_VINCULO_DIAS);
    const limiteInferiorStr = limiteInferior.toISOString().split("T")[0];
    const dataConversaoStr = dataConversao.toISOString().split("T")[0];

    // 4. Buscar candidatos no banco (pre-filtro por vendedora + compareceu + janela + nao vinculado)
    const candidatos = await prisma.registroSDR.findMany({
      where: {
        vendedoraId: venda.vendedorId,
        compareceu: true,
        vendaVinculadaId: null,
        origemRegistro: origemEsperada,
        dataReuniao: {
          gte: limiteInferiorStr,
          lte: dataConversaoStr,
        },
      },
    });

    // 5. Filtrar por nome normalizado em memoria (SQLite nao tem collation accent-insensitive)
    const matches = candidatos.filter(
      (r) => normalizeClientName(r.nomeCliente) === nomeNormalizado
    );

    // 6. Decidir com base no numero de matches
    if (matches.length === 0) {
      // Nenhum SDR envolvido — nada a fazer
      return;
    }

    if (matches.length === 1) {
      // Match unico — vincular automaticamente
      const registro = matches[0];
      // Auto-prospeccao do vendedor (origemRegistro=VENDEDOR): o vendedor ja
      // recebe a comissao da venda. NAO acumula comissao SDR — so marca VENDIDO
      // pra contabilizar a eficiencia da prospeccao propria.
      const ehAutoProspeccao = registro.origemRegistro === "VENDEDOR";
      const comissaoVendaSDR = ehAutoProspeccao ? 0 : COMISSAO_VENDA_SDR;
      await prisma.registroSDR.update({
        where: { id: registro.id },
        data: {
          vendaVinculadaId: venda.id,
          dataVendaVinculada: dataConversaoStr,
          comissaoVenda: comissaoVendaSDR,
          comissaoTotal: registro.comissaoReuniao + comissaoVendaSDR,
          statusLead: "VENDIDO",
        },
      });
      return;
    }

    // Multiplos matches — criar pendencia para supervisor/diretor resolver
    await prisma.pendenciaVinculo.create({
      data: {
        vendaId: venda.id,
        status: "PENDENTE",
      },
    });
  } catch (error) {
    // Nao bloquear a criacao da venda se o vinculo falhar
    console.error("Erro ao tentar vincular venda ao SDR:", error);
  }
}

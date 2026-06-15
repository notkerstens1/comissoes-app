"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// A criacao de venda agora vive integrada dentro de Minhas Vendas (/vendas),
// no accordion "Nova Venda" — que ja tem o formulario completo, incluindo o
// toggle de origem EXTERNA/INBOUND do vendedor hibrido (Daniel).
//
// Esta rota foi mantida apenas como redirect: qualquer atalho/bookmark antigo
// para /vendas/nova passa a cair em Minhas Vendas com o formulario ja aberto,
// sem abrir uma tela separada.
export default function NovaVendaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/vendas?novaVenda=1");
  }, [router]);

  return null;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Endpoint read-only que alimenta o Mapa de Usinas (LIV).
// Protegido por token: Authorization: Bearer <token>. Compara SHA-256 com o hash
// abaixo (o token em texto vive so no lado do mapa). Devolve as usinas instaladas.
const TOKEN_HASH =
  "6bb0681b0a1d7a0da7509cd91c131537069421672bc633ea33789a7049ee396b";

const ETAPAS_INSTALADA = ["INSTALACAO_CONCLUIDA", "SOLICITADO_VISTORIA", "REDE_LIGADA"];

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || sha256(token) !== TOKEN_HASH) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const cards = await prisma.setorTecnico.findMany({
    where: { ativo: true, etapaInstalacao: { in: ETAPAS_INSTALADA } },
    select: {
      id: true,
      nomeCliente: true,
      cidadeInstalacao: true,
      enderecoInstalacao: true,
      latitude: true,
      longitude: true,
      etapaInstalacao: true,
      dataInstalacao: true,
      dataRedeLigada: true,
      venda: { select: { cliente: true, kwp: true, geracaoKwh: true } },
    },
  });

  const usinas = cards.map((c) => ({
    id: c.id,
    cliente: (c.venda?.cliente || c.nomeCliente || "").trim(),
    cidade: c.cidadeInstalacao,
    endereco: c.enderecoInstalacao,
    latitude: c.latitude,
    longitude: c.longitude,
    potencia_kwp: c.venda?.kwp ?? null,
    geracao_estimada_kwh_mes: c.venda?.geracaoKwh ?? null,
    data_instalacao: c.dataInstalacao || c.dataRedeLigada || null,
    etapa: c.etapaInstalacao,
  }));

  return NextResponse.json(
    { usinas },
    { headers: { "cache-control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditCustoMaterial } from "@/lib/roles";

const STATUS_VALIDOS = ["VERDE", "AMARELO", "VERMELHO"];

// PUT — lanca o custo real do material CA e a cor (manual) no card.
// Restrito a engenharia (TECNICO/ADMIN/DIRETOR) — "isso aqui so pra mim" (Pedro).
// Campos escalares, um endpoint separado so pra poder restringir por papel
// (o PUT generico do card aceita POS_VENDA, aqui nao).
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  if (!canEditCustoMaterial(session.user.role)) {
    return NextResponse.json({ error: "Apenas a engenharia pode lancar o custo do material" }, { status: 403 });
  }

  const registro = await prisma.setorTecnico.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const data: { custoMaterialReal?: number | null; statusMaterial?: string | null } = {};

  if ("custoMaterialReal" in body) {
    const v = body.custoMaterialReal;
    if (v === null || v === "" || v === undefined) {
      data.custoMaterialReal = null;
    } else {
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: "Custo invalido" }, { status: 400 });
      }
      data.custoMaterialReal = n;
    }
  }

  if ("statusMaterial" in body) {
    const s = body.statusMaterial;
    if (s === null || s === "" || s === undefined) {
      data.statusMaterial = null;
    } else if (STATUS_VALIDOS.includes(s)) {
      data.statusMaterial = s;
    } else {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const updated = await prisma.setorTecnico.update({
    where: { id: params.id },
    data,
    select: { id: true, custoMaterialReal: true, statusMaterial: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}

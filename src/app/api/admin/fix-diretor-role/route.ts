import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/fix-diretor-role
// Corrige o role de erick@agenciarapport.com para DIRETOR
// Protegido pelo mesmo BACKUP_SECRET do sistema
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.BACKUP_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: "erick@agenciarapport.com" },
    select: { id: true, nome: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario erick@agenciarapport.com nao encontrado" }, { status: 404 });
  }

  if (user.role === "DIRETOR") {
    return NextResponse.json({ ok: true, message: "Ja e DIRETOR, sem alteracao", user });
  }

  const updated = await prisma.user.update({
    where: { email: "erick@agenciarapport.com" },
    data: { role: "DIRETOR" },
    select: { id: true, nome: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, message: "Role corrigido para DIRETOR", user: updated });
}

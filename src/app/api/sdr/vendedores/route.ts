import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Lista vendedores ativos para dropdown do SDR
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const vendedores = await prisma.user.findMany({
    where: { ativo: true, role: "VENDEDOR" },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(vendedores);
}

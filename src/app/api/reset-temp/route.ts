import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chave = searchParams.get("chave");

  if (chave !== "liv2026reset") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const senha = await hash("diretor123", 12);
  const user = await prisma.user.update({
    where: { email: "diretor@solar.com" },
    data: { senha },
    select: { email: true, nome: true },
  });

  return NextResponse.json({ ok: true, usuario: user.email, mensagem: "Senha resetada para: diretor123" });
}

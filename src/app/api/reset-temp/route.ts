import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chave = searchParams.get("chave");

  if (chave !== "liv2026reset") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const senha = await hash("diretor123", 12);

    // Busca todos os diretores para diagnóstico
    const diretores = await prisma.user.findMany({
      where: { role: "DIRETOR" },
      select: { email: true, nome: true, id: true },
    });

    if (diretores.length === 0) {
      // Cria o diretor se não existir
      const novo = await prisma.user.create({
        data: { nome: "Erick Santos", email: "diretor@solar.com", senha, role: "DIRETOR" },
        select: { email: true, nome: true },
      });
      return NextResponse.json({ ok: true, acao: "criado", usuario: novo.email, mensagem: "Diretor criado. Use: diretor@solar.com / diretor123" });
    }

    // Reseta apenas a senha, mantém role DIRETOR
    const atualizados = [];
    for (const d of diretores) {
      await prisma.user.update({ where: { id: d.id }, data: { senha } });
      atualizados.push(d.email);
    }

    return NextResponse.json({ ok: true, acao: "resetado", diretores: atualizados, mensagem: "Senha resetada para: diretor123" });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { isAdmin, isDiretor, canManageTeam } from "@/lib/roles";

// GET - Listar membros do time (admin/diretor/pos_venda)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageTeam(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const vendedores = await prisma.user.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
      createdAt: true,
      _count: { select: { vendas: true } },
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(vendedores);
}

// POST - Criar membro do time (admin/diretor/pos_venda)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageTeam(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { nome, email, senha, role } = body;

  // Somente DIRETOR pode criar usuarios com role DIRETOR
  if (role === "DIRETOR" && !isDiretor(session.user.role)) {
    return NextResponse.json({ error: "Somente o diretor pode criar outro diretor" }, { status: 403 });
  }

  if (!nome || !email || !senha) {
    return NextResponse.json(
      { error: "Nome, email e senha sao obrigatorios" },
      { status: 400 }
    );
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json(
      { error: "Email ja cadastrado" },
      { status: 400 }
    );
  }

  const senhaHash = await hash(senha, 12);

  const user = await prisma.user.create({
    data: {
      nome,
      email,
      senha: senhaHash,
      role: role || "VENDEDOR",
    },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senha = await hash("diretor123", 12);
  const user = await prisma.user.update({
    where: { email: "diretor@solar.com" },
    data: { senha },
  });
  console.log("Senha resetada com sucesso:", user.email);
}

main().finally(() => prisma.$disconnect());

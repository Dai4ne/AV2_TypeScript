import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Cria o primeiro administrador usando credenciais definidas no .env.
const prisma = new PrismaClient();
try {
    const nome = process.env.ADMIN_USER;
    const senha = process.env.ADMIN_PASSWORD;
    if (!nome || !senha) throw new Error("Defina ADMIN_USER e ADMIN_PASSWORD no .env antes do seed.");

    const existeAdmin = await prisma.usuario.count({ where: { papel: "ADMINISTRADOR", ativo: true } });
    if (existeAdmin === 0) {
        const salt = randomBytes(16).toString("hex");
        const hashSenha = createHash("sha256").update(senha + salt).digest("hex");
        await prisma.usuario.create({ data: { usuario: nome, hashSenha, salt, papel: "ADMINISTRADOR" } });
        console.log(`Administrador inicial criado: ${nome}`);
    } else {
        console.log("Já existe um administrador ativo; nenhum usuário foi criado.");
    }
} finally {
    await prisma.$disconnect();
}

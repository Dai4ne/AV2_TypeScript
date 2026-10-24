import { prisma } from "../database/prisma.js";

// Faz uma consulta mínima para confirmar que o banco responde.
export const saudeRepository = {
    async verificarBanco(): Promise<void> {
        await prisma.$queryRaw`SELECT 1`;
    },
};

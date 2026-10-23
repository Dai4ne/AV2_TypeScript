import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";

// Verifica que a API está ativa e que o banco responde.
export async function registrarRotaSaude(app: FastifyInstance): Promise<void> {
    app.get(
        "/health",
        {
            schema: {
                summary: "Verifica a API e a conexão com o banco",
                response: {
                    200: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            banco: { type: "string" },
                        },
                        required: ["status", "banco"],
                    },
                },
            },
        },
        async () => {
            await prisma.$queryRawUnsafe("SELECT 1");
            return { status: "ok", banco: "conectado" };
        },
    );
}
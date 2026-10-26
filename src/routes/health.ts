import type { FastifyInstance } from "fastify";
import { saudeController } from "../controllers/saude.controller.js";

// Expõe uma rota simples para conferir se API e banco estão ativos.
export async function registrarRotaSaude(app: FastifyInstance): Promise<void> {
    app.get(
        "/health",
        {
            schema: {
                summary: "Verifica a API e a conexão com o banco",
                description: "Rota pública. Se o banco estiver indisponível, a API responde com erro interno.",
                tags: ["saúde"],
                security: [],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            banco: { type: "string" },
                        },
                        required: ["status", "banco"],
                    },
                    500: { type: "object", properties: { statusCode: { type: "integer" }, error: { type: "string" }, message: { type: "string" } } },
                },
            },
        },
        saudeController.verificar,
    );
}

import type { FastifyInstance } from "fastify";
import { authController } from "../controllers/auth.controller.js";

// Rota pública que entrega JWT após validar usuário e senha.
export async function registrarRotasAuth(app: FastifyInstance): Promise<void> {
    app.post("/auth/login", {
        schema: {
            summary: "Autentica usuário e entrega token JWT por 30 minutos",
            security: [],
            body: { type: "object", additionalProperties: false, required: ["usuario", "senha"], properties: { usuario: { type: "string", minLength: 1 }, senha: { type: "string", minLength: 1 } } },
        },
    }, authController.login as any);
}

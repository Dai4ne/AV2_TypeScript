import type { FastifyInstance } from "fastify";
import { authController } from "../controllers/auth.controller.js";
import { respostas } from "./openapi.js";

// Rota pública que entrega JWT após validar usuário e senha.
export async function registrarRotasAuth(app: FastifyInstance): Promise<void> {
    app.post("/auth/login", {
        schema: {
            summary: "Autentica usuário e entrega token JWT por 30 minutos",
            description: "Envie usuário e senha. O token de acesso deve ser enviado nas próximas chamadas pelo botão Authorize como Bearer.",
            tags: ["autenticação"],
            security: [],
            body: { type: "object", additionalProperties: false, required: ["usuario", "senha"], properties: { usuario: { type: "string", minLength: 1 }, senha: { type: "string", minLength: 1 } } },
            response: respostas("#/components/schemas/Login", "Credenciais aceitas; token JWT emitido.", 200, [400, 401, 500]),
        },
    }, authController.login as any);
}

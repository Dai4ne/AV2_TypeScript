import type { FastifyReply, FastifyRequest } from "fastify";
import { saudeService } from "../services/saude.service.js";

// Monta a resposta HTTP da verificação de saúde.
export const saudeController = {
    async verificar(_request: FastifyRequest, reply: FastifyReply) {
        await saudeService.verificarBanco();
        return reply.send({ status: "ok", banco: "conectado" });
    },
};

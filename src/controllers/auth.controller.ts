import type { FastifyReply, FastifyRequest } from "fastify";
import { usuarioService, ErroUsuario } from "../services/usuario.service.js";

// Valida as credenciais e emite um JWT válido por 30 minutos.
export const authController = {
    async login(request: FastifyRequest<{ Body: { usuario: string; senha: string } }>, reply: FastifyReply) {
        try {
            const dados = await usuarioService.autenticar(request.body.usuario, request.body.senha);
            const token = request.server.jwt.sign({ sub: dados.id, usuario: dados.usuario, papel: dados.papel }, { expiresIn: "30m" });
            return reply.send({ token, tipo: "Bearer", expiraEm: "30 minutos" });
        } catch (erro) {
            if (erro instanceof ErroUsuario) return reply.code(erro.statusCode).send({ erro: erro.message });
            throw erro;
        }
    },
};

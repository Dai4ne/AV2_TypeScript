import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { PapelUsuario } from "@prisma/client";

// Confere o JWT enviado no cabeçalho Authorization.
export const autenticar: preHandlerHookHandler = async (request, reply) => {
    try { await request.jwtVerify(); }
    catch { return reply.code(401).send({ erro: "Token ausente, inválido ou expirado." }); }
};

// Administrador pode acessar todas as rotas; os outros papéis seguem a permissão da AV1.
export function exigirPapeis(...permitidos: PapelUsuario[]): preHandlerHookHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const usuario = request.user as { papel?: PapelUsuario };
        if (usuario.papel === "ADMINISTRADOR" || (usuario.papel && permitidos.includes(usuario.papel))) return;
        return reply.code(403).send({ erro: "Seu papel não tem permissão para esta operação." });
    };
}

import type { FastifyReply, FastifyRequest } from "fastify";
import type { PapelUsuario } from "@prisma/client";
import { ErroUsuario, usuarioService } from "../services/usuario.service.js";

type Params = { id: string };
type CreateBody = { usuario: string; senha: string; papel: PapelUsuario };
type UpdateBody = { usuario: string; papel: PapelUsuario };
type PasswordBody = { senha: string; senhaAtual?: string };

// Converte as requisições HTTP em operações de usuário.
export const usuarioController = {
    async listar(_request: FastifyRequest, reply: FastifyReply) { return reply.send(await usuarioService.listar()); },
    async listarPorPapel(request: FastifyRequest<{ Params: { papel: PapelUsuario } }>, reply: FastifyReply) {
        return reply.send(await usuarioService.listarPorPapel(request.params.papel));
    },
    async buscar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => usuarioService.buscar(request.params.id)); },
    async criar(request: FastifyRequest<{ Body: CreateBody }>, reply: FastifyReply) { return responder(reply, () => usuarioService.criar(request.body.usuario, request.body.senha, request.body.papel), 201); },
    async atualizar(request: FastifyRequest<{ Params: Params; Body: UpdateBody }>, reply: FastifyReply) { return responder(reply, () => usuarioService.atualizar(request.params.id, request.body.usuario, request.body.papel)); },
    async inativar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => usuarioService.alterarAtivo(request.params.id, false)); },
    async ativar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => usuarioService.alterarAtivo(request.params.id, true)); },
    async alterarSenha(request: FastifyRequest<{ Params: Params; Body: PasswordBody }>, reply: FastifyReply) {
        const identidade = request.user as { sub?: string; papel?: string };
        if (identidade.sub === request.params.id) {
            return responder(reply, () => usuarioService.alterarSenhaPropria(request.params.id, request.body.senhaAtual ?? "", request.body.senha));
        }
        if (identidade.papel !== "ADMINISTRADOR") return reply.code(403).send({ erro: "Somente o próprio usuário ou um administrador pode alterar esta senha." });
        return responder(reply, () => usuarioService.redefinirSenha(request.params.id, request.body.senha));
    },
};

async function responder(reply: FastifyReply, acao: () => Promise<unknown>, sucesso = 200) {
    try { return reply.code(sucesso).send(await acao()); }
    catch (erro) {
        if (erro instanceof ErroUsuario) return reply.code(erro.statusCode).send({ erro: erro.message });
        throw erro;
    }
}

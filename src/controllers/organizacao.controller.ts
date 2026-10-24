import type { FastifyReply, FastifyRequest } from "fastify";
import { ErroOrganizacao, organizacaoService } from "../services/organizacao.service.js";

type Params = { id: string };
type Dados = { id: string; razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string };
type Editar = Omit<Dados, "id">;

// Converte requisições de organização em chamadas ao serviço.
export const organizacaoController = {
    async listar(_request: FastifyRequest, reply: FastifyReply) { return reply.send(await organizacaoService.listar()); },
    async buscar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.buscar(request.params.id)); },
    async criar(request: FastifyRequest<{ Body: Dados }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.criar(request.body), 201); },
    async atualizar(request: FastifyRequest<{ Params: Params; Body: Editar }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.atualizar(request.params.id, request.body)); },
    async inativar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.inativar(request.params.id)); },
    async ativar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.ativar(request.params.id)); },
};

async function responder(reply: FastifyReply, acao: () => Promise<unknown>, status = 200) {
    try { return reply.code(status).send(await acao()); }
    catch (erro) {
        if (erro instanceof ErroOrganizacao) return reply.code(erro.statusCode).send({ erro: erro.message });
        throw erro;
    }
}

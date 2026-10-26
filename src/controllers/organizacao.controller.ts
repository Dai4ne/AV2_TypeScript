import type { FastifyReply, FastifyRequest } from "fastify";
import { ErroOrganizacao, organizacaoService } from "../services/organizacao.service.js";

type Params = { id: string };
type Dados = { id: string; razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string };
type Editar = Omit<Dados, "id"> & { versao: number };
type VersaoQuery = { versao: number };

// Converte requisições de organização em chamadas ao serviço.
export const organizacaoController = {
    async listar(_request: FastifyRequest, reply: FastifyReply) { return reply.send(await organizacaoService.listar()); },
    async buscar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.buscar(request.params.id)); },
    async criar(request: FastifyRequest<{ Body: Dados }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.criar(request.body), 201); },
    async atualizar(request: FastifyRequest<{ Params: Params; Body: Editar }>, reply: FastifyReply) {
        const { versao, ...dados } = request.body;
        return responder(reply, () => organizacaoService.atualizar(request.params.id, versao, dados));
    },
    async inativar(request: FastifyRequest<{ Params: Params; Querystring: VersaoQuery }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.inativar(request.params.id, request.query.versao)); },
    async ativar(request: FastifyRequest<{ Params: Params; Body: { versao: number } }>, reply: FastifyReply) { return responder(reply, () => organizacaoService.ativar(request.params.id, request.body.versao)); },
};

async function responder(reply: FastifyReply, acao: () => Promise<unknown>, status = 200) {
    try { return reply.code(status).send(await acao()); }
    catch (erro) {
        if (erro instanceof ErroOrganizacao) return reply.code(erro.statusCode).send({ erro: erro.message });
        throw erro;
    }
}

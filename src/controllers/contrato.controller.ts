import type { FastifyReply, FastifyRequest } from "fastify";
import { contratoService, ErroContrato } from "../services/contrato.service.js";

type IdParams = { id: string };
type CriarBody = {
    organizacaoId: string;
    dataAssinatura: string;
    dataVencimento: string;
    clausulas: string[];
    valorMensal: number;
    renovacaoAutomatica: boolean;
};
type AtualizarBody = Omit<CriarBody, "organizacaoId"> & { versao: number };
type VersaoQuery = { versao: number };

// Encaminha as requisições HTTP para o serviço de contratos.
export const contratoController = {
    async listar(_request: FastifyRequest, reply: FastifyReply) {
        return reply.send(await contratoService.listar());
    },
    async buscar(request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) {
        return responder(reply, () => contratoService.buscar(request.params.id));
    },
    async criar(request: FastifyRequest<{ Body: CriarBody }>, reply: FastifyReply) {
        const dados = {
            ...request.body,
            dataAssinatura: new Date(request.body.dataAssinatura),
            dataVencimento: new Date(request.body.dataVencimento),
        };
        return responder(reply, () => contratoService.criar(dados), 201);
    },
    async atualizar(request: FastifyRequest<{ Params: IdParams; Body: AtualizarBody }>, reply: FastifyReply) {
        const { versao, ...corpo } = request.body;
        const dados = {
            ...corpo,
            dataAssinatura: new Date(corpo.dataAssinatura),
            dataVencimento: new Date(corpo.dataVencimento),
        };
        return responder(reply, () => contratoService.atualizar(request.params.id, versao, dados));
    },
    async excluir(request: FastifyRequest<{ Params: IdParams; Querystring: VersaoQuery }>, reply: FastifyReply) {
        return responder(reply, () => contratoService.excluir(request.params.id, request.query.versao));
    },
};

// PadronizA respostas de sucesso e erros conhecidos.
async function responder(reply: FastifyReply, acao: () => Promise<unknown>, sucesso = 200) {
    try {
        return reply.code(sucesso).send(await acao());
    } catch (erro) {
        if (erro instanceof ErroContrato) return reply.code(erro.statusCode).send({ erro: erro.message });
        throw erro;
    }
}

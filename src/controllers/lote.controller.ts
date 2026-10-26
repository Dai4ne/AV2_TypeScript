import type { FastifyReply, FastifyRequest } from "fastify";
import type { StatusLote } from "@prisma/client";
import { ErroLote, loteService } from "../services/lote.service.js";

type Params = { id: string };
type CriarBody = { id: string; dataEntrada: string; organizacaoId: string; notaFiscal: string; transportadora: string; observacoes?: string };
type AtualizarBody = Omit<CriarBody, "id"> & { observacoes: string; versao: number };
type StatusBody = { versao: number; status: StatusLote };
type PeriodoQuery = { dataInicio: string; dataFim: string };
type VersaoQuery = { versao: number };

// Encaminha requisições HTTP às regras de lote.
export const loteController = {
    async listar(_request: FastifyRequest, reply: FastifyReply) { return reply.send(await loteService.listar()); },
    async listarPorPeriodo(request: FastifyRequest<{ Querystring: PeriodoQuery }>, reply: FastifyReply) {
        return responder(reply, () => loteService.listarPorPeriodo(new Date(request.query.dataInicio), new Date(request.query.dataFim)));
    },
    async buscar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => loteService.buscar(request.params.id)); },
    async criar(request: FastifyRequest<{ Body: CriarBody }>, reply: FastifyReply) {
        const dados = { ...request.body, dataEntrada: new Date(request.body.dataEntrada), observacoes: request.body.observacoes ?? "" };
        return responder(reply, () => loteService.criar(dados), 201);
    },
    async atualizar(request: FastifyRequest<{ Params: Params; Body: AtualizarBody }>, reply: FastifyReply) {
        const { versao, ...corpo } = request.body;
        const dados = { ...corpo, dataEntrada: new Date(corpo.dataEntrada) };
        return responder(reply, () => loteService.atualizar(request.params.id, versao, dados));
    },
    async atualizarStatus(request: FastifyRequest<{ Params: Params; Body: StatusBody }>, reply: FastifyReply) {
        return responder(reply, () => loteService.atualizarStatus(request.params.id, request.body.versao, request.body.status));
    },
    async inativar(request: FastifyRequest<{ Params: Params; Querystring: VersaoQuery }>, reply: FastifyReply) { return responder(reply, () => loteService.inativar(request.params.id, request.query.versao)); },
    async ativar(request: FastifyRequest<{ Params: Params; Body: { versao: number } }>, reply: FastifyReply) { return responder(reply, () => loteService.ativar(request.params.id, request.body.versao)); },
};

async function responder(reply: FastifyReply, acao: () => Promise<unknown>, status = 200) {
    try { return reply.code(status).send(await acao()); }
    catch (erro) {
        if (erro instanceof ErroLote) return reply.code(erro.statusCode).send({ erro: erro.message });
        throw erro;
    }
}

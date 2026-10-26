import type { FastifyReply, FastifyRequest } from "fastify";
import type { StatusRastreamento } from "@prisma/client";
import { ErroRelatorio, relatorioService } from "../services/relatorio.service.js";

type Periodo = { dataInicio: string; dataFim: string };

// Converte os filtros HTTP e devolve os resultados do relatório.
export const relatorioController = {
    async porOrganizacao(request: FastifyRequest<{ Params: { organizacaoId: string }; Querystring: Periodo }>, reply: FastifyReply) {
        return responder(reply, () => relatorioService.porOrganizacao(
            request.params.organizacaoId, new Date(request.query.dataInicio), new Date(request.query.dataFim),
        ));
    },
    async porStatus(request: FastifyRequest<{ Querystring: { status: StatusRastreamento } }>, reply: FastifyReply) {
        return responder(reply, () => relatorioService.porStatus(request.query.status));
    },
    async financeiro(request: FastifyRequest<{ Querystring: Periodo }>, reply: FastifyReply) {
        return responder(reply, () => relatorioService.financeiro(
            new Date(request.query.dataInicio), new Date(request.query.dataFim),
        ));
    },
    async triagem(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        return responder(reply, () => relatorioService.triagem(request.params.id));
    },
};

async function responder(reply: FastifyReply, acao: () => Promise<unknown>) {
    try { return reply.send(await acao()); }
    catch (erro) {
        if (erro instanceof ErroRelatorio) return reply.code(erro.statusCode).send({ erro: erro.message });
        throw erro;
    }
}

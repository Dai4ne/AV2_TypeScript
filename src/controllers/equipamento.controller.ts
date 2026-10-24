import type { FastifyReply, FastifyRequest } from "fastify";
import type { EstadoFisico, StatusRastreamento, TipoEquipamento } from "@prisma/client";
import { equipamentoService, ErroEquipamento } from "../services/equipamento.service.js";

type Params = { id: string };
type CriarBody = { id: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number; estadoFisico: EstadoFisico; pesoQuilogramas: number; loteId: string };
type AtualizarBody = Omit<CriarBody, "id" | "loteId"> & { justificativa?: string };
type StatusBody = { status: StatusRastreamento };
type CorpoMovimentacao = { origem: string; destino: string; observacao?: string };

// Usa o nome do usuário autenticado como responsável pelo registro.
function nomeResponsavel(request: FastifyRequest): string {
    return (request.user as { usuario: string }).usuario;
}

// Encaminha requisições HTTP às operações de equipamento.
export const equipamentoController = {
    async listar(_request: FastifyRequest, reply: FastifyReply) { return reply.send(await equipamentoService.listar()); },
    async buscar(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => equipamentoService.buscar(request.params.id)); },
    async criar(request: FastifyRequest<{ Body: CriarBody }>, reply: FastifyReply) { return responder(reply, () => equipamentoService.criar(request.body), 201); },
    async atualizar(request: FastifyRequest<{ Params: Params; Body: AtualizarBody }>, reply: FastifyReply) { return responder(reply, () => equipamentoService.atualizar(request.params.id, request.body)); },
    async atualizarStatus(request: FastifyRequest<{ Params: Params; Body: StatusBody }>, reply: FastifyReply) {
        return responder(reply, () => equipamentoService.atualizarStatus(request.params.id, request.body.status, nomeResponsavel(request)));
    },
    async excluir(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
        try { await equipamentoService.excluir(request.params.id); return reply.code(204).send(); }
        catch (erro) { return enviarErro(reply, erro); }
    },
    async listarMovimentacoes(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) { return responder(reply, () => equipamentoService.listarMovimentacoes(request.params.id)); },
    async registrarMovimentacao(request: FastifyRequest<{ Params: Params; Body: CorpoMovimentacao }>, reply: FastifyReply) {
        return responder(reply, () => equipamentoService.registrarMovimentacao({
            equipamentoId: request.params.id, ...request.body, responsavel: nomeResponsavel(request), observacao: request.body.observacao ?? "",
        }), 201);
    },
};

async function responder(reply: FastifyReply, acao: () => Promise<unknown>, sucesso = 200) {
    try { return reply.code(sucesso).send(await acao()); }
    catch (erro) { return enviarErro(reply, erro); }
}
function enviarErro(reply: FastifyReply, erro: unknown) {
    if (erro instanceof ErroEquipamento) return reply.code(erro.statusCode).send({ erro: erro.message });
    throw erro;
}

import { Prisma } from "@prisma/client";
import type { StatusLote } from "@prisma/client";
import { loteRepository } from "../repositories/lote.repository.js";

// Erro de regra de negócio com o código HTTP correspondente.
export class ErroLote extends Error { constructor(public readonly statusCode: number, mensagem: string) { super(mensagem); } }
type DadosLote = { id: string; dataEntrada: Date; organizacaoId: string; notaFiscal: string; transportadora: string; observacoes: string };
type EdicaoLote = Omit<DadosLote, "id">;

// Valida as regras de organização, contrato e datas dos lotes.
export const loteService = {
    listar() { return loteRepository.listar(); },
    listarPorPeriodo(inicio: Date, fim: Date) {
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
            throw new ErroLote(400, "Informe um período válido, com data inicial anterior ou igual à final.");
        }
        return loteRepository.listarPorPeriodo(inicio, fim);
    },
    async buscar(id: string) {
        const lote = await loteRepository.buscarPorId(id);
        if (!lote || !lote.ativo) throw new ErroLote(404, "Lote não encontrado ou inativo.");
        return lote;
    },
    async criar(dados: DadosLote) {
        await validarOrganizacaoComContrato(dados.organizacaoId);
        validarDadosLote(dados);
        try { return await loteRepository.criar(dados); }
        catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroLote(409, "Já existe lote com esse identificador.");
            throw erro;
        }
    },
    async atualizar(id: string, versao: number, dados: EdicaoLote) {
        const lote = await this.buscar(id);
        if (dados.organizacaoId !== lote.organizacaoId) await validarOrganizacaoComContrato(dados.organizacaoId);
        validarDadosLote(dados);
        const resultado = await loteRepository.atualizar(id, versao, dados);
        if (!resultado) throw new ErroLote(409, "O lote foi alterado por outra requisição. Consulte os dados novamente.");
        return resultado;
    },
    async atualizarStatus(id: string, versao: number, status: StatusLote) {
        const lote = await this.buscar(id);
        if (status === "TRIAGEM_CONCLUIDA") throw new ErroLote(400, "TRIAGEM_CONCLUIDA é definido automaticamente pelo sistema.");
        const equipamentosAtivos = lote.equipamentos;
        const todosComBaixaDefinitiva = equipamentosAtivos.length > 0
            && equipamentosAtivos.every((equipamento) => equipamento.statusRastreamento === "BAIXA_DEFINITIVA");
        if (todosComBaixaDefinitiva) {
            throw new ErroLote(409, "O lote está com TRIAGEM_CONCLUIDA porque todos os equipamentos chegaram à baixa definitiva.");
        }
        const resultado = await loteRepository.atualizarStatus(id, versao, status);
        if (!resultado) throw new ErroLote(409, "O lote foi alterado por outra requisição. Consulte os dados novamente.");
        return resultado;
    },
    async inativar(id: string, versao: number) {
        await this.buscar(id);
        const resultado = await loteRepository.inativarEmCadeia(id, versao);
        if (!resultado) throw new ErroLote(409, "O lote foi alterado por outra requisição. Consulte os dados novamente.");
        return resultado;
    },
    async ativar(id: string, versao: number) {
        const lote = await loteRepository.buscarParaAtivar(id);
        if (!lote) throw new ErroLote(404, "Lote não encontrado.");
        if (!lote.organizacao.ativo) throw new ErroLote(409, "Reative a organização antes de reativar o lote.");
        const resultado = await loteRepository.ativarEmCadeia(id, versao);
        if (!resultado) throw new ErroLote(409, "O lote foi alterado por outra requisição. Consulte os dados novamente.");
        return resultado;
    },
};

async function validarOrganizacaoComContrato(id: string) {
    const organizacao = await loteRepository.buscarOrganizacaoComContrato(id);
    if (!organizacao || !organizacao.ativo) throw new ErroLote(404, "Organização não encontrada ou inativa.");
    const hoje = new Date();
    if (!organizacao.contrato || organizacao.contrato.dataAssinatura > hoje || organizacao.contrato.dataVencimento < hoje) {
        throw new ErroLote(409, "A organização precisa ter contrato vigente para receber um lote.");
    }
}

function validarDadosLote(dados: EdicaoLote) {
    if (Number.isNaN(dados.dataEntrada.getTime())) throw new ErroLote(400, "Data de entrada inválida.");
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const entrada = new Date(dados.dataEntrada.getFullYear(), dados.dataEntrada.getMonth(), dados.dataEntrada.getDate());
    const limite = new Date(inicioHoje);
    limite.setDate(limite.getDate() - 90);
    if (entrada < limite || entrada > inicioHoje) throw new ErroLote(400, "A data do lote deve estar entre hoje e os últimos 90 dias.");
    if (!dados.notaFiscal.trim() || !dados.transportadora.trim()) throw new ErroLote(400, "Nota fiscal e transportadora são obrigatórias.");
}

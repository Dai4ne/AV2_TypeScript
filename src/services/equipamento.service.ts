import { Prisma } from "@prisma/client";
import type { EstadoFisico, StatusRastreamento, TipoEquipamento } from "@prisma/client";
import { equipamentoRepository } from "../repositories/equipamento.repository.js";

// Erro de regra de negócio com o código HTTP a retornar.
export class ErroEquipamento extends Error {
    constructor(public readonly statusCode: number, mensagem: string) { super(mensagem); }
}

type DadosEquipamento = {
    id: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number;
    estadoFisico: EstadoFisico; pesoQuilogramas: number; loteId: string;
};
type DadosAtualizacao = Partial<Omit<DadosEquipamento, "id" | "loteId">> & { justificativa?: string };

// Valida cadastro e manutenção sem permitir trocar o código de barras/ID.
export const equipamentoService = {
    listar() { return equipamentoRepository.listar(); },
    async buscar(id: string) {
        const item = await equipamentoRepository.buscarPorId(id);
        if (!item || !item.ativo) throw new ErroEquipamento(404, "Equipamento não encontrado.");
        return item;
    },
    async criar(dados: DadosEquipamento, versaoLote: number) {
        if (!dados.id.trim() || dados.id !== dados.id.trim()) throw new ErroEquipamento(400, "O ID do equipamento é obrigatório e não pode ter espaços nas extremidades.");
        if (!Number.isInteger(dados.anoFabricacao) || dados.anoFabricacao < 1900) throw new ErroEquipamento(400, "Ano de fabricação inválido.");
        if (!Number.isFinite(dados.pesoQuilogramas) || dados.pesoQuilogramas <= 0) throw new ErroEquipamento(400, "Peso deve ser maior que zero.");
        let resultado;
        try { resultado = await equipamentoRepository.criar(dados, versaoLote); }
        catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroEquipamento(409, "Já existe equipamento com esse código de barras.");
            throw erro;
        }
        if ("erro" in resultado) {
            if (resultado.erro === "LOTE_INATIVO") throw new ErroEquipamento(404, "Lote ou organização não encontrado ou inativo.");
            if (resultado.erro === "CONFLITO_VERSAO") throw new ErroEquipamento(409, "O lote foi alterado por outra requisição. Consulte-o novamente antes de adicionar o equipamento.");
            throw new ErroEquipamento(400, "O ID do equipamento não pode ter espaços nas extremidades.");
        }
        return resultado.equipamento;
    },
    async atualizar(id: string, versao: number, dados: DadosAtualizacao, responsavel: string) {
        const atual = await this.buscar(id);
        if (dados.anoFabricacao !== undefined && (!Number.isInteger(dados.anoFabricacao) || dados.anoFabricacao < 1900)) throw new ErroEquipamento(400, "Ano de fabricação inválido.");
        if (dados.pesoQuilogramas !== undefined && (!Number.isFinite(dados.pesoQuilogramas) || dados.pesoQuilogramas <= 0)) throw new ErroEquipamento(400, "Peso deve ser maior que zero.");
        if (dados.estadoFisico !== undefined) {
            const ordem: EstadoFisico[] = ["NOVO", "BOM_ESTADO", "USADO_LEVE", "USADO_MODERADO", "DANIFICADO_LEVE", "DANIFICADO_GRAVE", "INSERVIVEL"];
            const piora = ordem.indexOf(dados.estadoFisico) - ordem.indexOf(atual.estadoFisico);
            if (piora >= 2 && !dados.justificativa?.trim()) throw new ErroEquipamento(400, "Informe uma justificativa ao piorar duas ou mais categorias do estado físico.");
        }
        const { justificativa: _justificativa, ...campos } = dados;
        try {
            const resultado = await equipamentoRepository.atualizar(id, campos, versao, responsavel, dados.justificativa);
            if (!resultado) throw new ErroEquipamento(404, "Equipamento não encontrado ou inativo.");
            if ("conflito" in resultado) throw new ErroEquipamento(409, "O equipamento foi alterado por outra requisição. Consulte os dados novamente.");
            return resultado;
        }
        catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025") throw new ErroEquipamento(404, "Equipamento não encontrado.");
            throw erro;
        }
    },
    async atualizarStatus(id: string, versao: number, status: StatusRastreamento, responsavel: string) {
        const item = await equipamentoRepository.atualizarStatus(id, versao, status, responsavel);
        if (!item) throw new ErroEquipamento(404, "Equipamento não encontrado ou inativo.");
        if ("conflito" in item) throw new ErroEquipamento(409, "O equipamento foi alterado por outra requisição. Consulte os dados novamente.");
        return item;
    },
    async excluir(id: string, versao: number) {
        await this.buscar(id);
        const excluido = await equipamentoRepository.excluirDefinitivamente(id, versao);
        if (!excluido) throw new ErroEquipamento(409, "O equipamento foi alterado por outra requisição. Consulte os dados novamente.");
        return excluido;
    },
    async listarMovimentacoes(id: string) {
        await this.buscar(id);
        return equipamentoRepository.listarMovimentacoes(id);
    },
    async registrarMovimentacao(dados: { equipamentoId: string; origem: string; destino: string; responsavel: string; observacao: string }) {
        const movimentacao = await equipamentoRepository.registrarMovimentacao(dados);
        if (!movimentacao) throw new ErroEquipamento(404, "Equipamento não encontrado ou inativo.");
        return movimentacao;
    },
};

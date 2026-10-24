import { prisma } from "../database/prisma.js";
import type { EstadoFisico, StatusRastreamento, TipoEquipamento } from "@prisma/client";

// Reúne as operações de equipamento e o histórico de movimentações.
export const equipamentoRepository = {
    listar() {
        return prisma.equipamento.findMany({ where: { ativo: true }, orderBy: [{ loteId: "asc" }, { posicaoNoLote: "asc" }] });
    },
    buscarPorId(id: string) {
        return prisma.equipamento.findUnique({
            where: { id },
            include: { movimentacoes: { orderBy: { dataHora: "asc" } } },
        });
    },
    async criar(dados: {
        id: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number;
        estadoFisico: EstadoFisico; pesoQuilogramas: number; loteId: string;
    }) {
        return prisma.$transaction(async (tx) => {
            const lote = await tx.lote.findUnique({ where: { id: dados.loteId }, include: { organizacao: true } });
            if (!lote || !lote.ativo || !lote.organizacao.ativo) return { erro: "LOTE_INATIVO" as const };
            if (dados.id.trim() !== dados.id || !dados.id) {
                return { erro: "ID_INVALIDO" as const };
            }
            const ultimaPosicao = await tx.equipamento.aggregate({ where: { loteId: dados.loteId }, _max: { posicaoNoLote: true } });
            const equipamento = await tx.equipamento.create({
                data: {
                    ...dados,
                    codigoBarrasInterno: dados.id,
                    posicaoNoLote: (ultimaPosicao._max.posicaoNoLote ?? 0) + 1,
                },
            });
            return { equipamento };
        });
    },
    atualizar(id: string, dados: {
        tipo?: TipoEquipamento; marca?: string; modelo?: string; anoFabricacao?: number;
        estadoFisico?: EstadoFisico; pesoQuilogramas?: number;
    }) {
        return prisma.equipamento.update({ where: { id }, data: dados });
    },
    async atualizarStatus(id: string, status: StatusRastreamento, responsavel: string) {
        return prisma.$transaction(async (tx) => {
            const atual = await tx.equipamento.findUnique({ where: { id }, include: { lote: true } });
            if (!atual || !atual.ativo || !atual.lote.ativo) return null;
            if (atual.statusRastreamento === status) return atual;

            const equipamento = await tx.equipamento.update({ where: { id }, data: { statusRastreamento: status } });
            await tx.movimentacao.create({ data: { equipamentoId: id, origem: atual.statusRastreamento, destino: status, responsavel } });

            const ativos = await tx.equipamento.findMany({
                where: { loteId: atual.loteId, ativo: true },
                select: { statusRastreamento: true },
            });
            if (ativos.length > 0 && ativos.every((item) => item.statusRastreamento === "BAIXA_DEFINITIVA")) {
                await tx.lote.update({ where: { id: atual.loteId }, data: { statusProcessamento: "TRIAGEM_CONCLUIDA" } });
            }
            return equipamento;
        });
    },
    async excluirDefinitivamente(id: string) {
        return prisma.$transaction(async (tx) => {
            // Exclui o histórico vinculado antes do equipamento, como exige a relação do banco.
            await tx.movimentacao.deleteMany({ where: { equipamentoId: id } });
            return tx.equipamento.delete({ where: { id } });
        });
    },
    listarMovimentacoes(equipamentoId: string) {
        return prisma.movimentacao.findMany({ where: { equipamentoId }, orderBy: { dataHora: "asc" } });
    },
    registrarMovimentacao(dados: { equipamentoId: string; origem: string; destino: string; responsavel: string; observacao: string }) {
        return prisma.$transaction(async (tx) => {
            const equipamento = await tx.equipamento.findUnique({ where: { id: dados.equipamentoId }, include: { lote: true } });
            if (!equipamento || !equipamento.ativo || !equipamento.lote.ativo) return null;
            return tx.movimentacao.create({ data: dados });
        });
    },
};

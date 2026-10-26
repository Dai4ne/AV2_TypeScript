import { prisma } from "../database/prisma.js";

// Centraliza consultas, gravações e inativação de lotes.
export const loteRepository = {
    listar() {
        return prisma.lote.findMany({ where: { ativo: true }, orderBy: { dataEntrada: "desc" } });
    },
    listarPorPeriodo(inicio: Date, fim: Date) {
        return prisma.lote.findMany({
            where: { ativo: true, dataEntrada: { gte: inicio, lte: fim } },
            orderBy: { dataEntrada: "desc" },
        });
    },
    buscarPorId(id: string) {
        return prisma.lote.findUnique({ where: { id }, include: { equipamentos: { where: { ativo: true }, orderBy: { posicaoNoLote: "asc" } } } });
    },
    buscarParaAtivar(id: string) {
        return prisma.lote.findUnique({ where: { id }, include: { organizacao: true } });
    },
    buscarOrganizacaoComContrato(organizacaoId: string) {
        return prisma.organizacao.findUnique({
            where: { id: organizacaoId },
            include: { contrato: true },
        });
    },
    criar(dados: { id: string; dataEntrada: Date; organizacaoId: string; notaFiscal: string; transportadora: string; observacoes: string }) {
        return prisma.lote.create({ data: dados });
    },
    atualizarStatus(id: string, status: import("@prisma/client").StatusLote) {
        return prisma.lote.update({ where: { id }, data: { statusProcessamento: status } });
    },
    atualizar(id: string, dados: { organizacaoId: string; dataEntrada: Date; notaFiscal: string; transportadora: string; observacoes: string }) {
        return prisma.lote.update({ where: { id }, data: dados });
    },
    async inativarEmCadeia(id: string) {
        // Mantém os equipamentos do lote, mas os marca como inativos.
        return prisma.$transaction(async (tx) => {
            await tx.equipamento.updateMany({ where: { loteId: id }, data: { ativo: false } });
            return tx.lote.update({ where: { id }, data: { ativo: false } });
        });
    },
    async ativarEmCadeia(id: string) {
        // Reativa o lote e seus equipamentos na mesma transação.
        return prisma.$transaction(async (tx) => {
            await tx.lote.update({ where: { id }, data: { ativo: true } });
            await tx.equipamento.updateMany({ where: { loteId: id }, data: { ativo: true } });
            return tx.lote.findUniqueOrThrow({ where: { id }, include: { equipamentos: { where: { ativo: true } } } });
        });
    },
};

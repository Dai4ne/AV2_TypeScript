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
    async atualizarStatus(id: string, versao: number, status: import("@prisma/client").StatusLote) {
        const resultado = await prisma.lote.updateMany({ where: { id, ativo: true, versao }, data: { statusProcessamento: status, versao: { increment: 1 } } });
        return resultado.count ? prisma.lote.findUnique({ where: { id } }) : null;
    },
    async atualizar(id: string, versao: number, dados: { organizacaoId: string; dataEntrada: Date; notaFiscal: string; transportadora: string; observacoes: string }) {
        const resultado = await prisma.lote.updateMany({ where: { id, ativo: true, versao }, data: { ...dados, versao: { increment: 1 } } });
        return resultado.count ? prisma.lote.findUnique({ where: { id } }) : null;
    },
    async inativarEmCadeia(id: string, versao: number) {
        // Mantém os equipamentos do lote, mas os marca como inativos.
        return prisma.$transaction(async (tx) => {
            const resultado = await tx.lote.updateMany({ where: { id, ativo: true, versao }, data: { ativo: false, versao: { increment: 1 } } });
            if (!resultado.count) return null;
            await tx.equipamento.updateMany({ where: { loteId: id }, data: { ativo: false, versao: { increment: 1 } } });
            return tx.lote.findUnique({ where: { id } });
        });
    },
    async ativarEmCadeia(id: string, versao: number) {
        // Reativa o lote e seus equipamentos Na mesma transação.
        return prisma.$transaction(async (tx) => {
            const resultado = await tx.lote.updateMany({ where: { id, ativo: false, versao }, data: { ativo: true, versao: { increment: 1 } } });
            if (!resultado.count) return null;
            await tx.equipamento.updateMany({ where: { loteId: id }, data: { ativo: true, versao: { increment: 1 } } });
            return tx.lote.findUniqueOrThrow({ where: { id }, include: { equipamentos: { where: { ativo: true } } } });
        });
    },
};

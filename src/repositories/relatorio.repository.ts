import { prisma } from "../database/prisma.js";
import type { StatusRastreamento } from "@prisma/client";

// Busca os dados que os serviços organizam em relatórios.
export const relatorioRepository = {
    organizacaoNoPeriodo(organizacaoId: string, inicio: Date, fim: Date) {
        return prisma.organizacao.findUnique({
            where: { id: organizacaoId },
            include: {
                lotes: {
                    where: { ativo: true, dataEntrada: { gte: inicio, lte: fim } },
                    select: { id: true, dataEntrada: true, statusProcessamento: true },
                    orderBy: { dataEntrada: "asc" },
                },
            },
        });
    },
    quantidadePorStatus(status: StatusRastreamento) {
        return prisma.equipamento.count({ where: { ativo: true, statusRastreamento: status } });
    },
    contratosNoPeriodo(inicio: Date, fim: Date) {
        return prisma.contrato.findMany({
            where: {
                dataAssinatura: { lte: fim },
                dataVencimento: { gte: inicio },
                organizacao: { ativo: true },
            },
            include: { organizacao: { select: { id: true, razaoSocial: true } } },
            orderBy: { dataAssinatura: "asc" },
        });
    },
    loteComEquipamentos(loteId: string) {
        return prisma.lote.findUnique({
            where: { id: loteId },
            include: {
                equipamentos: {
                    where: { ativo: true },
                    select: { id: true, pesoQuilogramas: true, statusRastreamento: true },
                    orderBy: { posicaoNoLote: "asc" },
                },
            },
        });
    },
};

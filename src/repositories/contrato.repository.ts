import { prisma } from "../database/prisma.js";

// Centraliza as operações de leitura e gravação de contratos.
export const contratoRepository = {
    listar() {
        return prisma.contrato.findMany({ orderBy: { dataAssinatura: "desc" } });
    },
    buscarPorId(id: string) {
        return prisma.contrato.findUnique({ where: { id } });
    },
    buscarOrganizacao(organizacaoId: string) {
        return prisma.organizacao.findUnique({ where: { id: organizacaoId } });
    },
    criar(dados: {
        organizacaoId: string;
        dataAssinatura: Date;
        dataVencimento: Date;
        clausulas: string[];
        valorMensal: number;
        renovacaoAutomatica: boolean;
    }) {
        return prisma.contrato.create({ data: { ...dados, clausulas: dados.clausulas } });
    },
    atualizar(id: string, dados: {
        dataAssinatura: Date;
        dataVencimento: Date;
        clausulas: string[];
        valorMensal: number;
        renovacaoAutomatica: boolean;
    }) {
        return prisma.contrato.update({ where: { id }, data: dados });
    },
    excluir(id: string) {
        // Contratos são removidos definitivamente conforme a regra do professor.
        return prisma.contrato.delete({ where: { id } });
    },
};

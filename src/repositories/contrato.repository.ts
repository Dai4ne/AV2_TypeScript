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
    async atualizar(id: string, versao: number, dados: {
        dataAssinatura: Date;
        dataVencimento: Date;
        clausulas: string[];
        valorMensal: number;
        renovacaoAutomatica: boolean;
    }) {
        const resultado = await prisma.contrato.updateMany({ where: { id, versao }, data: { ...dados, versao: { increment: 1 } } });
        return resultado.count ? prisma.contrato.findUnique({ where: { id } }) : null;
    },
    async excluir(id: string, versao: number) {
        // Contratos são removidos definitivamente conforme a regra do professor.
        const resultado = await prisma.contrato.deleteMany({ where: { id, versao } });
        return resultado.count > 0;
    },
};

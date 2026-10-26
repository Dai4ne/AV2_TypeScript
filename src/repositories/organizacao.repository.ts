import { prisma } from "../database/prisma.js";

// Centraliza consultas e alterações de organização no Prisma.
export const organizacaoRepository = {
    listar() { return prisma.organizacao.findMany({ where: { ativo: true }, orderBy: { razaoSocial: "asc" } }); },
    buscarPorId(id: string) { return prisma.organizacao.findUnique({ where: { id } }); },
    buscarPorEmail(email: string, ignorarId?: string) {
        return prisma.organizacao.findFirst({
            where: {
                email: { equals: email, mode: "insensitive" },
                ...(ignorarId ? { id: { not: ignorarId } } : {}),
            },
        });
    },
    criar(dados: { id: string; razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string }) {
        return prisma.organizacao.create({ data: dados });
    },
    async atualizar(id: string, versao: number, dados: { razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string }) {
        const resultado = await prisma.organizacao.updateMany({ where: { id, ativo: true, versao }, data: { ...dados, versao: { increment: 1 } } });
        return resultado.count ? prisma.organizacao.findUnique({ where: { id } }) : null;
    },
    async inativarEmCadeia(id: string, versao: number) {
        // Inativa organização, lotes e equipamentos na mesma transação.
        return prisma.$transaction(async (tx) => {
            const resultado = await tx.organizacao.updateMany({ where: { id, ativo: true, versao }, data: { ativo: false, versao: { increment: 1 } } });
            if (!resultado.count) return null;
            await tx.equipamento.updateMany({ where: { lote: { organizacaoId: id } }, data: { ativo: false, versao: { increment: 1 } } });
            await tx.lote.updateMany({ where: { organizacaoId: id }, data: { ativo: false, versao: { increment: 1 } } });
            return tx.organizacao.findUnique({ where: { id } });
        });
    },
    async ativarEmCadeia(id: string, versao: number) {
        // Reativa a organização e seus lotes e equipamentos na mesma transação.
        return prisma.$transaction(async (tx) => {
            const resultado = await tx.organizacao.updateMany({ where: { id, ativo: false, versao }, data: { ativo: true, versao: { increment: 1 } } });
            if (!resultado.count) return null;
            await tx.lote.updateMany({ where: { organizacaoId: id }, data: { ativo: true, versao: { increment: 1 } } });
            await tx.equipamento.updateMany({ where: { lote: { organizacaoId: id } }, data: { ativo: true, versao: { increment: 1 } } });
            return tx.organizacao.findUniqueOrThrow({ where: { id } });
        });
    },
};

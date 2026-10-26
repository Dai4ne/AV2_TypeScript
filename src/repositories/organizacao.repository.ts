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
    atualizar(id: string, dados: { razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string }) {
        return prisma.organizacao.update({ where: { id }, data: dados });
    },
    async inativarEmCadeia(id: string) {
        // Inativa organização, lotes e equipamentos na mesma transação.
        return prisma.$transaction(async (tx) => {
            await tx.equipamento.updateMany({ where: { lote: { organizacaoId: id } }, data: { ativo: false } });
            await tx.lote.updateMany({ where: { organizacaoId: id }, data: { ativo: false } });
            return tx.organizacao.update({ where: { id }, data: { ativo: false } });
        });
    },
    ativar(id: string) { return prisma.organizacao.update({ where: { id }, data: { ativo: true } }); },
};

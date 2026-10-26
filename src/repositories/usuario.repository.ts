import { prisma } from "../database/prisma.js";
import type { PapelUsuario } from "@prisma/client";

const camposPublicos = { id: true, usuario: true, ultimoAcesso: true, papel: true, criadoEm: true, ativo: true } as const;

// Mantém consultas e alterações de usuário em um único local.
export const usuarioRepository = {
    listar() { return prisma.usuario.findMany({ where: { ativo: true }, select: camposPublicos, orderBy: { usuario: "asc" } }); },
    listarPorPapel(papel: PapelUsuario) {
        return prisma.usuario.findMany({ where: { ativo: true, papel }, select: camposPublicos, orderBy: { usuario: "asc" } });
    },
    buscarPorId(id: string) { return prisma.usuario.findUnique({ where: { id } }); },
    buscarPorNome(usuario: string) { return prisma.usuario.findUnique({ where: { usuario } }); },
    criar(dados: { usuario: string; hashSenha: string; salt: string; papel: PapelUsuario }) {
        return prisma.usuario.create({ data: dados, select: camposPublicos });
    },
    atualizar(id: string, dados: { usuario: string; papel: PapelUsuario }) {
        return prisma.usuario.update({ where: { id }, data: dados, select: camposPublicos });
    },
    atualizarSenha(id: string, hashSenha: string, salt: string) { return prisma.usuario.update({ where: { id }, data: { hashSenha, salt }, select: camposPublicos }); },
    atualizarAcesso(id: string) { return prisma.usuario.update({ where: { id }, data: { ultimoAcesso: new Date() } }); },
    alterarAtivo(id: string, ativo: boolean) { return prisma.usuario.update({ where: { id }, data: { ativo }, select: camposPublicos }); },
    contarAdministradoresAtivos() { return prisma.usuario.count({ where: { papel: "ADMINISTRADOR", ativo: true } }); },
};

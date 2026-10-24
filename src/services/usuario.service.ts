import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PapelUsuario } from "@prisma/client";
import { usuarioRepository } from "../repositories/usuario.repository.js";

// Erro esperado de usuário com seu código HTTP.
export class ErroUsuario extends Error {
    constructor(public readonly statusCode: number, mensagem: string) { super(mensagem); }
}

// Aplica regras de contas, senha, papéis e inativação.
export const usuarioService = {
    listar() { return usuarioRepository.listar(); },
    async buscar(id: string) {
        const usuario = await usuarioRepository.buscarPorId(id);
        if (!usuario || !usuario.ativo) throw new ErroUsuario(404, "Usuário não encontrado ou inativo.");
        const { hashSenha: _hash, salt: _salt, ...dadosPublicos } = usuario;
        return dadosPublicos;
    },
    async criar(usuario: string, senha: string, papel: PapelUsuario) {
        validarCredenciais(usuario, senha);
        const salt = randomBytes(16).toString("hex");
        try {
            return await usuarioRepository.criar({ usuario: usuario.trim(), salt, hashSenha: calcularHash(senha, salt), papel });
        } catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroUsuario(409, "Esse nome de usuário já existe.");
            throw erro;
        }
    },
    async atualizar(id: string, nome: string, papel: PapelUsuario) {
        const atual = await this.buscar(id);
        if (atual.papel === "ADMINISTRADOR" && papel !== "ADMINISTRADOR" && await usuarioRepository.contarAdministradoresAtivos() <= 1) {
            throw new ErroUsuario(409, "Não é possível remover o último administrador ativo.");
        }
        try { return await usuarioRepository.atualizar(id, { usuario: nome.trim(), papel }); }
        catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroUsuario(409, "Esse nome de usuário já existe.");
            throw erro;
        }
    },
    async alterarAtivo(id: string, ativo: boolean) {
        const usuario = await usuarioRepository.buscarPorId(id);
        if (!usuario) throw new ErroUsuario(404, "Usuário não encontrado.");
        if (!ativo && usuario.ativo && usuario.papel === "ADMINISTRADOR" && await usuarioRepository.contarAdministradoresAtivos() <= 1) {
            throw new ErroUsuario(409, "Não é possível inativar o último administrador ativo.");
        }
        return usuarioRepository.alterarAtivo(id, ativo);
    },
    async alterarSenhaPropria(id: string, senhaAtual: string, senhaNova: string) {
        const usuario = await usuarioRepository.buscarPorId(id);
        if (!usuario || !usuario.ativo || calcularHash(senhaAtual, usuario.salt) !== usuario.hashSenha) throw new ErroUsuario(401, "Senha atual incorreta.");
        if (!senhaNova) throw new ErroUsuario(400, "A senha nova não pode ficar vazia.");
        const salt = randomBytes(16).toString("hex");
        await usuarioRepository.atualizarSenha(id, calcularHash(senhaNova, salt), salt);
        return { mensagem: "Senha atualizada." };
    },
    async redefinirSenha(id: string, senha: string) {
        if (!senha) throw new ErroUsuario(400, "A senha não pode ficar vazia.");
        await this.buscar(id);
        const salt = randomBytes(16).toString("hex");
        await usuarioRepository.atualizarSenha(id, calcularHash(senha, salt), salt);
        return { mensagem: "Senha atualizada." };
    },
    async autenticar(nome: string, senha: string) {
        const usuario = await usuarioRepository.buscarPorNome(nome.trim());
        if (!usuario || !usuario.ativo || calcularHash(senha, usuario.salt) !== usuario.hashSenha) {
            throw new ErroUsuario(401, "Usuário ou senha incorretos.");
        }
        await usuarioRepository.atualizarAcesso(usuario.id);
        return { id: usuario.id, usuario: usuario.usuario, papel: usuario.papel };
    },
};

// Usa o mesmo formato de hash e salt adotado na AV1.
function calcularHash(senha: string, salt: string): string {
    return createHash("sha256").update(senha + salt).digest("hex");
}

function validarCredenciais(usuario: string, senha: string) {
    if (!usuario.trim()) throw new ErroUsuario(400, "O nome de usuário não pode ficar vazio.");
    if (!senha) throw new ErroUsuario(400, "A senha não pode ficar vazia.");
}

import { Prisma } from "@prisma/client";
import { organizacaoRepository } from "../repositories/organizacao.repository.js";
import { validarCnpj } from "../utils/cnpj.js";

// Erro de regra de negócio com o status HTTP adequado.
export class ErroOrganizacao extends Error {
    constructor(public readonly statusCode: number, mensagem: string) { super(mensagem); }
}

// Valida dados e preserva a regra de inativação em cadeia.
export const organizacaoService = {
    listar() { return organizacaoRepository.listar(); },
    async buscar(id: string) {
        const organizacao = await organizacaoRepository.buscarPorId(id);
        if (!organizacao || !organizacao.ativo) throw new ErroOrganizacao(404, "Organização não encontrada ou inativa.");
        return organizacao;
    },
    async criar(dados: { id: string; razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string }) {
        if (!validarCnpj(dados.cnpj)) throw new ErroOrganizacao(400, "CNPJ inválido.");
        dados.cnpj = dados.cnpj.replace(/\D/g, "");
        try { return await organizacaoRepository.criar(dados); }
        catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroOrganizacao(409, "Já existe organização com esse identificador ou CNPJ.");
            throw erro;
        }
    },
    async atualizar(id: string, dados: { razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string }) {
        await this.buscar(id);
        if (!validarCnpj(dados.cnpj)) throw new ErroOrganizacao(400, "CNPJ inválido.");
        dados.cnpj = dados.cnpj.replace(/\D/g, "");
        try { return await organizacaoRepository.atualizar(id, dados); }
        catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroOrganizacao(409, "Esse CNPJ já está cadastrado.");
            throw erro;
        }
    },
    async inativar(id: string) { await this.buscar(id); return organizacaoRepository.inativarEmCadeia(id); },
    async ativar(id: string) {
        const organizacao = await organizacaoRepository.buscarPorId(id);
        if (!organizacao) throw new ErroOrganizacao(404, "Organização não encontrada.");
        return organizacaoRepository.ativar(id);
    },
};

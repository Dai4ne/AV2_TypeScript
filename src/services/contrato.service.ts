import { Prisma } from "@prisma/client";
import { contratoRepository } from "../repositories/contrato.repository.js";

// Erro de regra de negócio com o status HTTP correspondente.
export class ErroContrato extends Error {
    constructor(public readonly statusCode: number, mensagem: string) {
        super(mensagem);
    }
}

type DadosContrato = {
    organizacaoId: string;
    dataAssinatura: Date;
    dataVencimento: Date;
    clausulas: string[];
    valorMensal: number;
    renovacaoAutomatica: boolean;
};
type DadosEdicao = Omit<DadosContrato, "organizacaoId">;

// Valida as regras do contrato antes de chamar o repositório.
export const contratoService = {
    listar() {
        return contratoRepository.listar();
    },
    async buscar(id: string) {
        const contrato = await contratoRepository.buscarPorId(id);
        if (!contrato) throw new ErroContrato(404, "Contrato não encontrado.");
        return contrato;
    },
    async criar(dados: DadosContrato) {
        const organizacao = await contratoRepository.buscarOrganizacao(dados.organizacaoId);
        if (!organizacao || !organizacao.ativo) throw new ErroContrato(404, "Organização não encontrada ou inativa.");
        validarDados(dados);
        try {
            return await contratoRepository.criar(dados);
        } catch (erro) {
            if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
                throw new ErroContrato(409, "Essa organização já possui um contrato.");
            }
            throw erro;
        }
    },
    async atualizar(id: string, versao: number, dados: DadosEdicao) {
        await this.buscar(id);
        validarDados(dados);
        const resultado = await contratoRepository.atualizar(id, versao, dados);
        if (!resultado) throw new ErroContrato(409, "O contrato foi alterado por outra requisição. Consulte os dados novamente.");
        return resultado;
    },
    async excluir(id: string, versao: number) {
        await this.buscar(id);
        const excluido = await contratoRepository.excluir(id, versao);
        if (!excluido) throw new ErroContrato(409, "O contrato foi alterado por outra requisição. Consulte os dados novamente.");
        return { mensagem: "Contrato excluído." };
    },
};

function validarDados(dados: DadosEdicao) {
    if (Number.isNaN(dados.dataAssinatura.getTime()) || Number.isNaN(dados.dataVencimento.getTime())) {
        throw new ErroContrato(400, "As datas do contrato são inválidas.");
    }
    if (dados.dataAssinatura > dados.dataVencimento) {
        throw new ErroContrato(400, "A assinatura não pode ocorrer depois do vencimento.");
    }
    if (!Number.isFinite(dados.valorMensal) || dados.valorMensal < 0) {
        throw new ErroContrato(400, "O valor mensal deve ser zero ou maior.");
    }
    if (!Array.isArray(dados.clausulas) || dados.clausulas.some((item) => typeof item !== "string")) {
        throw new ErroContrato(400, "Cláusulas devem ser uma lista de textos.");
    }
}

import type { StatusRastreamento } from "@prisma/client";
import { relatorioRepository } from "../repositories/relatorio.repository.js";

// Erro simples para filtros ou dados ausentes nos relatórios.
export class ErroRelatorio extends Error {
    constructor(public readonly statusCode: number, mensagem: string) { super(mensagem); }
}

// Aplica os filtros e prepara respostas em JSON para a API.
export const relatorioService = {
    async porOrganizacao(organizacaoId: string, inicio: Date, fim: Date) {
        validarPeriodo(inicio, fim);
        const organizacao = await relatorioRepository.organizacaoNoPeriodo(organizacaoId, inicio, fim);
        if (!organizacao) throw new ErroRelatorio(404, "Organização não encontrada.");
        return {
            organizacaoId,
            razaoSocial: organizacao.razaoSocial,
            periodo: { inicio, fim },
            quantidadeLotes: organizacao.lotes.length,
            lotes: organizacao.lotes,
        };
    },
    async porStatus(status: StatusRastreamento) {
        const quantidade = await relatorioRepository.quantidadePorStatus(status);
        return { status, quantidadeEquipamentosAtivos: quantidade };
    },
    async financeiro(inicio: Date, fim: Date) {
        validarPeriodo(inicio, fim);
        const contratos = await relatorioRepository.contratosNoPeriodo(inicio, fim);
        const somaValoresMensais = contratos.reduce((total, contrato) => total + Number(contrato.valorMensal), 0);
        return {
            periodo: { inicio, fim },
            quantidadeContratos: contratos.length,
            somaValoresMensais: Number(somaValoresMensais.toFixed(2)),
            contratos: contratos.map((contrato) => ({
                id: contrato.id,
                organizacaoId: contrato.organizacaoId,
                razaoSocial: contrato.organizacao.razaoSocial,
                valorMensal: Number(contrato.valorMensal),
                dataAssinatura: contrato.dataAssinatura,
                dataVencimento: contrato.dataVencimento,
            })),
        };
    },
    async triagem(loteId: string) {
        const lote = await relatorioRepository.loteComEquipamentos(loteId);
        if (!lote || !lote.ativo) throw new ErroRelatorio(404, "Lote não encontrado ou inativo.");
        const pesoTotal = lote.equipamentos.reduce((total, equipamento) => total + Number(equipamento.pesoQuilogramas), 0);
        const quantidadePorStatus = lote.equipamentos.reduce<Record<string, number>>((contagem, equipamento) => {
            contagem[equipamento.statusRastreamento] = (contagem[equipamento.statusRastreamento] ?? 0) + 1;
            return contagem;
        }, {});
        return {
            loteId: lote.id,
            quantidadeEquipamentos: lote.equipamentos.length,
            pesoTotalQuilogramas: Number(pesoTotal.toFixed(3)),
            quantidadePorStatus,
        };
    },
};

function validarPeriodo(inicio: Date, fim: Date): void {
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
        throw new ErroRelatorio(400, "Informe datas válidas para o período.");
    }
    if (inicio > fim) throw new ErroRelatorio(400, "A data inicial deve ser anterior ou igual à data final.");
}

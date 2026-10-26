import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dia = 24 * 60 * 60 * 1000;
const hoje = new Date();
const diasAtras = (quantidade: number) => new Date(hoje.getTime() - quantidade * dia);

// IDs fixos deixam a carga de exemplo segura para executar mais de uma vez.
const organizacaoAtiva = {
    id: "DEMO-ORG-ATIVA",
    razaoSocial: "Organização de Exemplo Ativa",
    cnpj: "11111111000191",
    inscricaoEstadual: "ISENTO",
    enderecoCompleto: "Rua dos Exemplos, 100",
    telefone: "11900000001",
    email: "organizacao-ativa@example.test",
};
const organizacaoExpirada = {
    id: "DEMO-ORG-CONTRATO-EXPIRADO",
    razaoSocial: "Organização de Exemplo sem Contrato Vigente",
    cnpj: "22222222000191",
    inscricaoEstadual: "ISENTO",
    enderecoCompleto: "Rua dos Exemplos, 200",
    telefone: "11900000002",
    email: "organizacao-expirada@example.test",
};

const lotes = [
    { id: "DEMO-LOTE-RECEBIDO", dataEntrada: diasAtras(2), notaFiscal: "DEMO-NF-001", statusProcessamento: "RECEBIDO" as const },
    { id: "DEMO-LOTE-TRIAGEM", dataEntrada: diasAtras(4), notaFiscal: "DEMO-NF-002", statusProcessamento: "EM_TRIAGEM" as const },
    { id: "DEMO-LOTE-ENCAMINHADO", dataEntrada: diasAtras(8), notaFiscal: "DEMO-NF-003", statusProcessamento: "ENCAMINHADO" as const },
    { id: "DEMO-LOTE-FINALIZADO", dataEntrada: diasAtras(12), notaFiscal: "DEMO-NF-004", statusProcessamento: "FINALIZADO" as const },
    { id: "DEMO-LOTE-TRIAGEM-CONCLUIDA", dataEntrada: diasAtras(6), notaFiscal: "DEMO-NF-005", statusProcessamento: "TRIAGEM_CONCLUIDA" as const },
];

const equipamentos = [
    { id: "DEMO-EQ-RECEBIDO-01", loteId: lotes[0].id, tipo: "NOTEBOOK" as const, estadoFisico: "BOM_ESTADO" as const, statusRastreamento: "AGUARDANDO_TRIAGEM" as const, peso: 2.4 },
    { id: "DEMO-EQ-TRIAGEM-01", loteId: lotes[1].id, tipo: "COMPUTADOR_MESA" as const, estadoFisico: "USADO_LEVE" as const, statusRastreamento: "EM_TRIAGEM" as const, peso: 8.2 },
    { id: "DEMO-EQ-TRIAGEM-02", loteId: lotes[1].id, tipo: "MONITOR" as const, estadoFisico: "USADO_MODERADO" as const, statusRastreamento: "AGUARDANDO_DESMONTAGEM" as const, peso: 4.1 },
    { id: "DEMO-EQ-ENCAMINHADO-01", loteId: lotes[2].id, tipo: "IMPRESSORA" as const, estadoFisico: "DANIFICADO_LEVE" as const, statusRastreamento: "PECAS_REAPROVEITADAS" as const, peso: 6.3 },
    { id: "DEMO-EQ-FINALIZADO-01", loteId: lotes[3].id, tipo: "ROTEADOR" as const, estadoFisico: "INSERVIVEL" as const, statusRastreamento: "DESCARTE_SEGURO" as const, peso: 1.2 },
    { id: "DEMO-EQ-CONCLUIDO-01", loteId: lotes[4].id, tipo: "SERVIDOR" as const, estadoFisico: "DANIFICADO_GRAVE" as const, statusRastreamento: "BAIXA_DEFINITIVA" as const, peso: 12.5 },
];

// Cria o administrador inicial e os dados de demonstração sem importar a AV1.
try {
    const nome = process.env.ADMIN_USER;
    const senha = process.env.ADMIN_PASSWORD;
    if (!nome || !senha) throw new Error("Defina ADMIN_USER e ADMIN_PASSWORD no .env antes do seed.");

    const existeAdmin = await prisma.usuario.count({ where: { papel: "ADMINISTRADOR", ativo: true } });
    if (existeAdmin === 0) {
        const salt = randomBytes(16).toString("hex");
        const hashSenha = createHash("sha256").update(senha + salt).digest("hex");
        const adminComMesmoNome = await prisma.usuario.findUnique({ where: { usuario: nome } });
        if (adminComMesmoNome) {
            await prisma.usuario.update({
                where: { id: adminComMesmoNome.id },
                data: { hashSenha, salt, papel: "ADMINISTRADOR", ativo: true },
            });
        } else {
            await prisma.usuario.create({ data: { usuario: nome, hashSenha, salt, papel: "ADMINISTRADOR" } });
        }
        console.log(`Administrador inicial criado ou reativado: ${nome}`);
    } else {
        console.log("Já existe um administrador ativo; nenhum usuário foi criado.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.organizacao.upsert({
            where: { id: organizacaoAtiva.id },
            create: organizacaoAtiva,
            update: { ...organizacaoAtiva, ativo: true },
        });
        await tx.organizacao.upsert({
            where: { id: organizacaoExpirada.id },
            create: organizacaoExpirada,
            update: { ...organizacaoExpirada, ativo: true },
        });

        await tx.contrato.upsert({
            where: { organizacaoId: organizacaoAtiva.id },
            create: {
                id: "DEMO-CONTRATO-ATIVO", organizacaoId: organizacaoAtiva.id,
                dataAssinatura: new Date("2025-01-01T12:00:00.000Z"), dataVencimento: new Date("2099-12-31T12:00:00.000Z"),
                clausulas: ["Contrato de demonstração"], valorMensal: 2500, renovacaoAutomatica: true,
            },
            update: {
                dataAssinatura: new Date("2025-01-01T12:00:00.000Z"), dataVencimento: new Date("2099-12-31T12:00:00.000Z"),
                clausulas: ["Contrato de demonstração"], valorMensal: 2500, renovacaoAutomatica: true,
            },
        });
        await tx.contrato.upsert({
            where: { organizacaoId: organizacaoExpirada.id },
            create: {
                id: "DEMO-CONTRATO-EXPIRADO", organizacaoId: organizacaoExpirada.id,
                dataAssinatura: new Date("2020-01-01T12:00:00.000Z"), dataVencimento: new Date("2021-12-31T12:00:00.000Z"),
                clausulas: ["Contrato de exemplo expirado"], valorMensal: 900, renovacaoAutomatica: false,
            },
            update: {
                dataAssinatura: new Date("2020-01-01T12:00:00.000Z"), dataVencimento: new Date("2021-12-31T12:00:00.000Z"),
                clausulas: ["Contrato de exemplo expirado"], valorMensal: 900, renovacaoAutomatica: false,
            },
        });

        for (const lote of lotes) {
            await tx.lote.upsert({
                where: { id: lote.id },
                create: {
                    ...lote, organizacaoId: organizacaoAtiva.id, transportadora: "Transportadora Exemplo",
                    observacoes: "Registro criado pelo seed de demonstração",
                },
                update: {
                    ...lote, organizacaoId: organizacaoAtiva.id, transportadora: "Transportadora Exemplo",
                    observacoes: "Registro criado pelo seed de demonstração", ativo: true,
                },
            });
        }

        const ultimaPosicaoPorLote = new Map<string, number>();
        for (const equipamento of equipamentos) {
            const posicaoNoLote = (ultimaPosicaoPorLote.get(equipamento.loteId) ?? 0) + 1;
            ultimaPosicaoPorLote.set(equipamento.loteId, posicaoNoLote);
            await tx.equipamento.upsert({
                where: { id: equipamento.id },
                create: {
                    id: equipamento.id, codigoBarrasInterno: equipamento.id, loteId: equipamento.loteId,
                    tipo: equipamento.tipo, marca: "Marca Exemplo", modelo: `Modelo ${posicaoNoLote}`,
                    anoFabricacao: 2022, estadoFisico: equipamento.estadoFisico,
                    pesoQuilogramas: equipamento.peso, posicaoNoLote,
                    statusRastreamento: equipamento.statusRastreamento,
                },
                update: {
                    codigoBarrasInterno: equipamento.id, loteId: equipamento.loteId,
                    tipo: equipamento.tipo, marca: "Marca Exemplo", modelo: `Modelo ${posicaoNoLote}`,
                    anoFabricacao: 2022, estadoFisico: equipamento.estadoFisico,
                    pesoQuilogramas: equipamento.peso, posicaoNoLote,
                    statusRastreamento: equipamento.statusRastreamento, ativo: true,
                },
            });

            if (equipamento.statusRastreamento !== "AGUARDANDO_TRIAGEM") {
                const idMovimentacao = `DEMO-MOV-${equipamento.id}`;
                await tx.movimentacao.upsert({
                    where: { id: idMovimentacao },
                    create: {
                        id: idMovimentacao, equipamentoId: equipamento.id,
                        dataHora: diasAtras(1), origem: "AGUARDANDO_TRIAGEM",
                        destino: equipamento.statusRastreamento, responsavel: "seed-demo",
                        observacao: "Movimentação de exemplo",
                    },
                    update: {
                        equipamentoId: equipamento.id, dataHora: diasAtras(1),
                        origem: "AGUARDANDO_TRIAGEM", destino: equipamento.statusRastreamento,
                        responsavel: "seed-demo", observacao: "Movimentação de exemplo",
                    },
                });
            }
        }
    });

    console.log("Dados de exemplo criados ou atualizados: organizações, contratos, lotes, equipamentos e movimentações.");
} finally {
    await prisma.$disconnect();
}

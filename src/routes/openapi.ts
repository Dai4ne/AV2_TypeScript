// Respostas comuns mantêm os códigos HTTP documentados de forma consistente.
export function respostas(
    sucesso: string,
    descricao: string,
    codigo = 200,
    erros: number[] = [400, 401, 403, 404, 409, 500],
) {
    const resultado: Record<string, unknown> = {};
    resultado[codigo] = codigo === 204
        ? { description: descricao }
        : { description: descricao, content: { "application/json": { schema: materializarEsquema(sucesso) } } };

    const mensagens: Record<number, string> = {
        400: "Requisição inválida ou regra de negócio não atendida.",
        401: "Token ausente, inválido ou expirado; ou credenciais inválidas.",
        403: "O papel do usuário não permite esta operação.",
        404: "Registro não encontrado ou inativo.",
        409: "Conflito de dados, como duplicidade ou versão desatualizada.",
        500: "Erro interno inesperado.",
    };
    for (const codigoErro of erros) {
        resultado[codigoErro] = {
            description: mensagens[codigoErro],
            content: { "application/json": { schema: materializarEsquema("#/components/schemas/Erro") } },
        };
    }
    return resultado as any;
}

export const esquemasOpenApi = {
    Erro: { oneOf: [{ $ref: "#/components/schemas/ErroDominio" }, { $ref: "#/components/schemas/ErroFastify" }] },
    ErroDominio: {
        type: "object", additionalProperties: false, required: ["erro"],
        properties: { erro: { type: "string", description: "Mensagem de validação, regra de negócio, autenticação ou conflito." } },
    },
    ErroFastify: {
        type: "object", required: ["statusCode", "error", "message"],
        properties: { statusCode: { type: "integer" }, error: { type: "string" }, message: { type: "string" } },
    },
    Mensagem: {
        type: "object", required: ["mensagem"], properties: { mensagem: { type: "string" } },
    },
    Usuario: {
        type: "object", required: ["id", "usuario", "papel", "criadoEm", "ativo"],
        properties: {
            id: { type: "string", format: "uuid" }, usuario: { type: "string" },
            ultimoAcesso: { type: "string", format: "date-time", nullable: true },
            papel: { type: "string", enum: ["ADMINISTRADOR", "OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"] },
            criadoEm: { type: "string", format: "date-time" }, ativo: { type: "boolean" },
        },
    },
    Organizacao: {
        type: "object", required: ["id", "razaoSocial", "cnpj", "inscricaoEstadual", "enderecoCompleto", "telefone", "email", "dataCadastro", "ativo", "versao"],
        properties: {
            id: { type: "string" }, razaoSocial: { type: "string" }, cnpj: { type: "string" },
            inscricaoEstadual: { type: "string" }, enderecoCompleto: { type: "string" }, telefone: { type: "string" },
            email: { type: "string", format: "email" }, dataCadastro: { type: "string", format: "date-time" },
            ativo: { type: "boolean" }, versao: { type: "integer", minimum: 1, description: "Número usado para detectar alterações simultâneas." },
        },
    },
    Contrato: {
        type: "object", required: ["id", "organizacaoId", "dataAssinatura", "dataVencimento", "clausulas", "valorMensal", "renovacaoAutomatica", "versao"],
        properties: {
            id: { type: "string", format: "uuid" }, organizacaoId: { type: "string" },
            dataAssinatura: { type: "string", format: "date-time" }, dataVencimento: { type: "string", format: "date-time" },
            clausulas: { type: "array", items: { type: "string" } }, valorMensal: { type: "string", description: "Valor decimal em formato textual." },
            renovacaoAutomatica: { type: "boolean" }, versao: { type: "integer", minimum: 1 },
        },
    },
    Lote: {
        type: "object", required: ["id", "dataEntrada", "organizacaoId", "notaFiscal", "transportadora", "statusProcessamento", "observacoes", "ativo", "versao"],
        properties: {
            id: { type: "string" }, dataEntrada: { type: "string", format: "date-time" }, organizacaoId: { type: "string" },
            notaFiscal: { type: "string" }, transportadora: { type: "string" },
            statusProcessamento: { type: "string", enum: ["RECEBIDO", "EM_TRIAGEM", "TRIAGEM_CONCLUIDA", "ENCAMINHADO", "FINALIZADO"] },
            observacoes: { type: "string" }, ativo: { type: "boolean" }, versao: { type: "integer", minimum: 1 },
            equipamentos: { type: "array", items: { $ref: "#/components/schemas/Equipamento" } },
        },
    },
    Equipamento: {
        type: "object", required: ["id", "codigoBarrasInterno", "tipo", "marca", "modelo", "anoFabricacao", "estadoFisico", "pesoQuilogramas", "loteId", "posicaoNoLote", "statusRastreamento", "ativo", "versao"],
        properties: {
            id: { type: "string" }, codigoBarrasInterno: { type: "string", description: "É igual ao ID do equipamento." },
            tipo: { type: "string", enum: ["COMPUTADOR_MESA", "NOTEBOOK", "MONITOR", "IMPRESSORA", "SERVIDOR", "ROTEADOR", "CABO_ESTRUTURADO", "FONTE_ALIMENTACAO"] },
            marca: { type: "string" }, modelo: { type: "string" }, anoFabricacao: { type: "integer" },
            estadoFisico: { type: "string", enum: ["NOVO", "BOM_ESTADO", "USADO_LEVE", "USADO_MODERADO", "DANIFICADO_LEVE", "DANIFICADO_GRAVE", "INSERVIVEL"] },
            pesoQuilogramas: { type: "string", description: "Peso decimal em formato textual." }, loteId: { type: "string" }, posicaoNoLote: { type: "integer" },
            statusRastreamento: { type: "string", enum: ["AGUARDANDO_TRIAGEM", "EM_TRIAGEM", "AGUARDANDO_DESMONTAGEM", "EM_DESMONTAGEM", "PECAS_REAPROVEITADAS", "MATERIAL_RECICLAVEL", "DESCARTE_SEGURO", "BAIXA_DEFINITIVA"] },
            ativo: { type: "boolean" }, versao: { type: "integer", minimum: 1 },
            movimentacoes: { type: "array", items: { $ref: "#/components/schemas/Movimentacao" } },
        },
    },
    Movimentacao: {
        type: "object", required: ["id", "equipamentoId", "dataHora", "origem", "destino", "responsavel", "observacao"],
        properties: {
            id: { type: "string", format: "uuid" }, equipamentoId: { type: "string" },
            dataHora: { type: "string", format: "date-time" }, dataHoraBrasilia: { type: "string" },
            origem: { type: "string" }, destino: { type: "string" }, responsavel: { type: "string" }, observacao: { type: "string" },
        },
    },
    Login: {
        type: "object", required: ["token", "tipo", "expiraEm"],
        properties: { token: { type: "string" }, tipo: { type: "string", example: "Bearer" }, expiraEm: { type: "string", example: "30 minutos" } },
    },
    RelatorioStatus: {
        type: "object", required: ["status", "quantidadeEquipamentosAtivos"],
        properties: { status: { type: "string" }, quantidadeEquipamentosAtivos: { type: "integer" } },
    },
    RelatorioOrganizacao: {
        type: "object", required: ["organizacaoId", "razaoSocial", "periodo", "quantidadeLotes", "lotes"],
        properties: {
            organizacaoId: { type: "string" }, razaoSocial: { type: "string" },
            periodo: { type: "object", required: ["inicio", "fim"], properties: { inicio: { type: "string", format: "date-time" }, fim: { type: "string", format: "date-time" } } },
            quantidadeLotes: { type: "integer" },
            lotes: { type: "array", items: { type: "object", required: ["id", "dataEntrada", "statusProcessamento"], properties: { id: { type: "string" }, dataEntrada: { type: "string", format: "date-time" }, statusProcessamento: { type: "string" } } } },
        },
    },
    RelatorioFinanceiro: {
        type: "object", required: ["periodo", "quantidadeContratos", "somaValoresMensais", "contratos"],
        properties: {
            periodo: { type: "object", required: ["inicio", "fim"], properties: { inicio: { type: "string", format: "date-time" }, fim: { type: "string", format: "date-time" } } },
            quantidadeContratos: { type: "integer" }, somaValoresMensais: { type: "number" },
            contratos: { type: "array", items: { type: "object", required: ["id", "organizacaoId", "razaoSocial", "valorMensal", "dataAssinatura", "dataVencimento"], properties: { id: { type: "string" }, organizacaoId: { type: "string" }, razaoSocial: { type: "string" }, valorMensal: { type: "number" }, dataAssinatura: { type: "string", format: "date-time" }, dataVencimento: { type: "string", format: "date-time" } } } },
        },
    },
    RelatorioTriagem: {
        type: "object", required: ["loteId", "quantidadeEquipamentos", "pesoTotalQuilogramas", "quantidadePorStatus"],
        properties: { loteId: { type: "string" }, quantidadeEquipamentos: { type: "integer" }, pesoTotalQuilogramas: { type: "number" }, quantidadePorStatus: { type: "object", additionalProperties: { type: "integer" } } },
    },
};

// Fastify usa referências próprias para serializar respostas; expandimos os componentes aqui.
export function materializarEsquema(referencia: string): any {
    const nome = referencia.split("/").pop() as keyof typeof esquemasOpenApi;
    const expandir = (valor: any): any => {
        if (Array.isArray(valor)) return valor.map(expandir);
        if (valor && typeof valor === "object") {
            if (typeof valor.$ref === "string" && valor.$ref.startsWith("#/components/schemas/")) {
                return materializarEsquema(valor.$ref);
            }
            return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, expandir(item)]));
        }
        return valor;
    };
    return expandir(esquemasOpenApi[nome]);
}

export function respostaLista(esquema: string, descricao: string) {
    return {
        200: { description: descricao, content: { "application/json": { schema: { type: "array", items: materializarEsquema(esquema) } } } },
        401: { description: "Token ausente, inválido ou expirado.", content: { "application/json": { schema: materializarEsquema("#/components/schemas/Erro") } } },
        403: { description: "O papel do usuário não permite esta operação.", content: { "application/json": { schema: materializarEsquema("#/components/schemas/Erro") } } },
        500: {
            description: "Erro interno inesperado.",
            content: { "application/json": { schema: materializarEsquema("#/components/schemas/Erro") } },
        },
    } as any;
}

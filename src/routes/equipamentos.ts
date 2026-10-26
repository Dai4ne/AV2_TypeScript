import type { FastifyInstance } from "fastify";
import { equipamentoController } from "../controllers/equipamento.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";
import { respostaLista, respostas } from "./openapi.js";

// Declara CRUD de equipamentos e consulta/registro de movimentações.
export async function registrarRotasEquipamento(app: FastifyInstance): Promise<void> {
    const params = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
    const tipos = ["COMPUTADOR_MESA", "NOTEBOOK", "MONITOR", "IMPRESSORA", "SERVIDOR", "ROTEADOR", "CABO_ESTRUTURADO", "FONTE_ALIMENTACAO"];
    const estados = ["NOVO", "BOM_ESTADO", "USADO_LEVE", "USADO_MODERADO", "DANIFICADO_LEVE", "DANIFICADO_GRAVE", "INSERVIVEL"];
    const status = ["AGUARDANDO_TRIAGEM", "EM_TRIAGEM", "AGUARDANDO_DESMONTAGEM", "EM_DESMONTAGEM", "PECAS_REAPROVEITADAS", "MATERIAL_RECICLAVEL", "DESCARTE_SEGURO", "BAIXA_DEFINITIVA"];
    const campos = {
        tipo: { type: "string", enum: tipos }, marca: { type: "string", minLength: 1 }, modelo: { type: "string", minLength: 1 },
        anoFabricacao: { type: "integer", minimum: 1900 }, estadoFisico: { type: "string", enum: estados },
        pesoQuilogramas: { type: "number", exclusiveMinimum: 0 },
    } as const;
    const criar = { type: "object", additionalProperties: false, required: ["id", "loteId", "versaoLote", ...Object.keys(campos)], properties: { id: { type: "string", minLength: 1 }, loteId: { type: "string", minLength: 1 }, versaoLote: { type: "integer", minimum: 1, description: "Versão atual do lote consultado." }, ...campos } } as const;
    const atualizar = { type: "object", additionalProperties: false, required: ["versao", ...Object.keys(campos)], properties: { versao: { type: "integer", minimum: 1 }, ...campos, justificativa: { type: "string" } } } as const;
    const versaoQuery = { type: "object", additionalProperties: false, required: ["versao"], properties: { versao: { type: "integer", minimum: 1 } } } as const;
    const gestor = { preHandler: [autenticar, exigirPapeis("GESTOR_ALMOXARIFADO")] };
    const leitor = { preHandler: [autenticar, exigirPapeis("GESTOR_ALMOXARIFADO", "AUDITOR")] };

    app.get("/equipamentos", { ...gestor, schema: { summary: "Lista equipamentos ativos", description: "Acesso de gestor de almoxarifado e administrador.", tags: ["equipamentos"], response: respostaLista("#/components/schemas/Equipamento", "Equipamentos ativos.") } }, equipamentoController.listar as any);
    app.get("/equipamentos/:id", { ...leitor, schema: { summary: "Busca equipamento e histórico", description: "Gestor de almoxarifado, auditor e administrador podem consultar.", params, tags: ["equipamentos"], response: respostas("#/components/schemas/Equipamento", "Equipamento encontrado com o histórico de movimentações.") } }, equipamentoController.buscar as any);
    app.post("/equipamentos", { ...gestor, schema: { summary: "Cadastra equipamento; ID também é código de barras", description: "Envie a versaoLote atual obtida ao consultar o lote. O lote deve estar ativo e pertencer a organização ativa.", body: criar, tags: ["equipamentos"], response: respostas("#/components/schemas/Equipamento", "Equipamento cadastrado.", 201, [400, 401, 403, 404, 409, 500]) } }, equipamentoController.criar as any);
    app.put("/equipamentos/:id", { ...gestor, schema: { summary: "Atualiza dados do equipamento", description: "Inclua a versão atual. Ao piorar duas ou mais categorias do estado físico, informe justificativa; a mudança e seu histórico são salvos juntos.", params, body: atualizar, tags: ["equipamentos"], response: respostas("#/components/schemas/Equipamento", "Equipamento atualizado; a versão é incrementada.") } }, equipamentoController.atualizar as any);
    app.patch("/equipamentos/:id/status", {
        ...gestor,
        schema: { summary: "Atualiza status, registra movimentação e recalcula o lote", description: "A atualização, a movimentação e eventual conclusão automática do lote são feitas na mesma transação. Envie a versão atual do equipamento.", params, body: {
            type: "object", additionalProperties: false, required: ["versao", "status"], properties: { versao: { type: "integer", minimum: 1 }, status: { type: "string", enum: status } },
        }, tags: ["equipamentos"], response: respostas("#/components/schemas/Equipamento", "Status atualizado e movimentação registrada.") },
    }, equipamentoController.atualizarStatus as any);
    app.delete("/equipamentos/:id", { ...gestor, schema: { summary: "Exclui equipamento e histórico definitivamente", description: "Envie a versão atual em `?versao=`. A resposta é 204 sem corpo.", params, querystring: versaoQuery, tags: ["equipamentos"], response: respostas("#/components/schemas/Mensagem", "Equipamento e histórico excluídos.", 204, [401, 403, 404, 409, 500]) } }, equipamentoController.excluir as any);
    app.get("/equipamentos/:id/movimentacoes", { ...leitor, schema: { summary: "Lista movimentações do equipamento", description: "A resposta inclui dataHoraBrasilia para leitura no fuso de Brasília.", params, tags: ["movimentações"], response: respostaLista("#/components/schemas/Movimentacao", "Histórico ordenado por data e hora.") } }, equipamentoController.listarMovimentacoes as any);
    app.post("/equipamentos/:id/movimentacoes", {
        ...gestor,
        schema: { summary: "Registra movimentação", description: "O responsável é obtido do usuário autenticado e o horário é preenchido pelo sistema.", params, body: {
            type: "object", additionalProperties: false, required: ["origem", "destino"],
            properties: { origem: { type: "string", minLength: 1 }, destino: { type: "string", minLength: 1 }, observacao: { type: "string" } },
        }, tags: ["movimentações"], response: respostas("#/components/schemas/Movimentacao", "Movimentação registrada.", 201, [400, 401, 403, 404, 500]) },
    }, equipamentoController.registrarMovimentacao as any);
}

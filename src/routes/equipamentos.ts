import type { FastifyInstance } from "fastify";
import { equipamentoController } from "../controllers/equipamento.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";

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
    const criar = { type: "object", additionalProperties: false, required: ["id", "loteId", ...Object.keys(campos)], properties: { id: { type: "string", minLength: 1 }, loteId: { type: "string", minLength: 1 }, ...campos } } as const;
    const atualizar = { type: "object", additionalProperties: false, required: Object.keys(campos), properties: { ...campos, justificativa: { type: "string" } } } as const;
    const gestor = { preHandler: [autenticar, exigirPapeis("GESTOR_ALMOXARIFADO")] };
    const leitor = { preHandler: [autenticar, exigirPapeis("GESTOR_ALMOXARIFADO", "AUDITOR")] };

    app.get("/equipamentos", { ...gestor, schema: { summary: "Lista equipamentos ativos", tags: ["equipamentos"] } }, equipamentoController.listar as any);
    app.get("/equipamentos/:id", { ...leitor, schema: { summary: "Busca equipamento e histórico", params, tags: ["equipamentos"] } }, equipamentoController.buscar as any);
    app.post("/equipamentos", { ...gestor, schema: { summary: "Cadastra equipamento; ID também é código de barras", body: criar, tags: ["equipamentos"] } }, equipamentoController.criar as any);
    app.put("/equipamentos/:id", { ...gestor, schema: { summary: "Atualiza dados e registra no histórico alterações do estado físico", params, body: atualizar, tags: ["equipamentos"] } }, equipamentoController.atualizar as any);
    app.patch("/equipamentos/:id/status", {
        ...gestor,
        schema: { summary: "Atualiza status, registra movimentação e recalcula o lote", params, body: {
            type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: status } },
        }, tags: ["equipamentos"] },
    }, equipamentoController.atualizarStatus as any);
    app.delete("/equipamentos/:id", { ...gestor, schema: { summary: "Exclui equipamento e histórico definitivamente", params, tags: ["equipamentos"] } }, equipamentoController.excluir as any);
    app.get("/equipamentos/:id/movimentacoes", { ...leitor, schema: { summary: "Lista movimentações", params, tags: ["movimentações"] } }, equipamentoController.listarMovimentacoes as any);
    app.post("/equipamentos/:id/movimentacoes", {
        ...gestor,
        schema: { summary: "Registra movimentação", params, body: {
            type: "object", additionalProperties: false, required: ["origem", "destino"],
            properties: { origem: { type: "string", minLength: 1 }, destino: { type: "string", minLength: 1 }, observacao: { type: "string" } },
        }, tags: ["movimentações"] },
    }, equipamentoController.registrarMovimentacao as any);
}

import type { FastifyInstance } from "fastify";
import { loteController } from "../controllers/lote.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";

// Define o CRUD de lotes e protege as operações para gestão de almoxarifado.
export async function registrarRotasLote(app: FastifyInstance): Promise<void> {
    const params = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
    const campos = {
        dataEntrada: { type: "string", format: "date-time" }, organizacaoId: { type: "string", minLength: 1 },
        notaFiscal: { type: "string", minLength: 1 }, transportadora: { type: "string", minLength: 1 }, observacoes: { type: "string" },
    } as const;
    const criar = { type: "object", additionalProperties: false, required: ["id", ...Object.keys(campos).slice(0, 4)], properties: { id: { type: "string", minLength: 1 }, ...campos } } as const;
    const atualizar = { type: "object", additionalProperties: false, required: Object.keys(campos), properties: campos } as const;
    const guard = { preHandler: [autenticar, exigirPapeis("GESTOR_ALMOXARIFADO")] };

    app.get("/lotes", { ...guard, schema: { summary: "Lista lotes ativos" } }, loteController.listar as any);
    app.get("/lotes/periodo", {
        ...guard,
        schema: {
            summary: "Lista lotes ativos recebidos no período",
            querystring: {
                type: "object", additionalProperties: false, required: ["dataInicio", "dataFim"],
                properties: { dataInicio: { type: "string", format: "date-time" }, dataFim: { type: "string", format: "date-time" } },
            },
        },
    }, loteController.listarPorPeriodo as any);
    app.get("/lotes/:id", { ...guard, schema: { summary: "Busca lote e equipamentos ativos", params } }, loteController.buscar as any);
    app.post("/lotes", { ...guard, schema: { summary: "Cadastra lote para organização com contrato vigente", body: criar } }, loteController.criar as any);
    app.put("/lotes/:id", { ...guard, schema: { summary: "Atualiza os dados do lote", params, body: atualizar } }, loteController.atualizar as any);
    app.patch("/lotes/:id/status", {
        ...guard,
        schema: {
            summary: "Altera manualmente o status do lote; TRIAGEM_CONCLUIDA é automática",
            params,
            body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: ["RECEBIDO", "EM_TRIAGEM", "ENCAMINHADO", "FINALIZADO"] } } },
        },
    }, loteController.atualizarStatus as any);
    app.delete("/lotes/:id", { ...guard, schema: { summary: "Inativa lote e seus equipamentos", params } }, loteController.inativar as any);
    app.patch("/lotes/:id/ativar", { ...guard, schema: { summary: "Reativa lote e seus equipamentos se a organização estiver ativa", params } }, loteController.ativar as any);
}

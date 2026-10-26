import type { FastifyInstance } from "fastify";
import { contratoController } from "../controllers/contrato.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";

// Define os endpoints do CRUD de contratos.
export async function registrarRotasContrato(app: FastifyInstance): Promise<void> {
    const params = {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", minLength: 1 } },
    } as const;
    const propriedades = {
        dataAssinatura: { type: "string", format: "date-time" },
        dataVencimento: { type: "string", format: "date-time" },
        clausulas: { type: "array", items: { type: "string" } },
        valorMensal: { type: "number", minimum: 0 },
        renovacaoAutomatica: { type: "boolean" },
    } as const;
    const criar = {
        type: "object",
        additionalProperties: false,
        required: ["organizacaoId", ...Object.keys(propriedades)],
        properties: { organizacaoId: { type: "string", minLength: 1 }, ...propriedades },
    } as const;
    const atualizar = {
        type: "object",
        additionalProperties: false,
        required: ["versao", ...Object.keys(propriedades)],
        properties: { versao: { type: "integer", minimum: 1 }, ...propriedades },
    } as const;
    const versaoQuery = { type: "object", additionalProperties: false, required: ["versao"], properties: { versao: { type: "integer", minimum: 1 } } } as const;

    app.get("/contratos", { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")], schema: { summary: "Lista contratos" } }, contratoController.listar as any);
    app.get("/contratos/:id", { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")], schema: { summary: "Busca contrato", params } }, contratoController.buscar as any);
    app.post("/contratos", { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")], schema: { summary: "Cadastra contrato para uma organização", body: criar } }, contratoController.criar as any);
    app.put("/contratos/:id", { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")], schema: { summary: "Atualiza contrato", params, body: atualizar } }, contratoController.atualizar as any);
    app.delete("/contratos/:id", { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")], schema: { summary: "Exclui contrato definitivamente", params, querystring: versaoQuery } }, contratoController.excluir as any);
}

import type { FastifyInstance } from "fastify";
import { contratoController } from "../controllers/contrato.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";
import { respostaLista, respostas } from "./openapi.js";

// Define os endpoints do CRUD de contratos.
export async function registrarRotasContrato(app: FastifyInstance): Promise<void> {
    const params = {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", minLength: 1 } },
    } as const;
    const propriedades = {
        dataAssinatura: { type: "string", format: "date-time", description: "Data e hora em que o contrato foi assinado." },
        dataVencimento: { type: "string", format: "date-time", description: "Data e hora final da vigência." },
        clausulas: { type: "array", items: { type: "string" }, description: "Cláusulas contratuais em texto." },
        valorMensal: { type: "number", minimum: 0, description: "Valor mensal em reais." },
        renovacaoAutomatica: { type: "boolean", description: "Indica se o contrato prevê renovação automática." },
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

    const acesso = { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")] };
    app.get("/contratos", { ...acesso, schema: { summary: "Lista contratos", description: "Acesso de operador de cadastro e administrador.", tags: ["contratos"], response: respostaLista("#/components/schemas/Contrato", "Contratos cadastrados.") } }, contratoController.listar as any);
    app.get("/contratos/:id", { ...acesso, schema: { summary: "Busca contrato por ID", tags: ["contratos"], params, response: respostas("#/components/schemas/Contrato", "Contrato encontrado.") } }, contratoController.buscar as any);
    app.post("/contratos", { ...acesso, schema: { summary: "Cadastra contrato para uma organização", description: "Cada organização pode ter um contrato. A organização precisa estar ativa.", tags: ["contratos"], body: criar, response: respostas("#/components/schemas/Contrato", "Contrato cadastrado.", 201, [400, 401, 403, 404, 409, 500]) } }, contratoController.criar as any);
    app.put("/contratos/:id", { ...acesso, schema: { summary: "Atualiza contrato", description: "Envie a versão atual do contrato. Se outro usuário já alterou os dados, a resposta será 409.", tags: ["contratos"], params, body: atualizar, response: respostas("#/components/schemas/Contrato", "Contrato atualizado; a versão é incrementada.") } }, contratoController.atualizar as any);
    app.delete("/contratos/:id", { ...acesso, schema: { summary: "Exclui contrato definitivamente", description: "Envie a versão atual em `?versao=`.", tags: ["contratos"], params, querystring: versaoQuery, response: respostas("#/components/schemas/Mensagem", "Contrato excluído.", 200, [401, 403, 404, 409, 500]) } }, contratoController.excluir as any);
}

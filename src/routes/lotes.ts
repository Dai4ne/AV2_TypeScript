import type { FastifyInstance } from "fastify";
import { loteController } from "../controllers/lote.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";
import { materializarEsquema, respostaLista, respostas } from "./openapi.js";

// Define o CRUD de lotes e protege as operações para gestão de almoxarifado.
export async function registrarRotasLote(app: FastifyInstance): Promise<void> {
    const params = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
    const campos = {
        dataEntrada: { type: "string", format: "date-time", description: "Data de recebimento; deve estar entre hoje e os últimos 90 dias." }, organizacaoId: { type: "string", minLength: 1, description: "ID de uma organização ativa com contrato vigente." },
        notaFiscal: { type: "string", minLength: 1 }, transportadora: { type: "string", minLength: 1 }, observacoes: { type: "string" },
    } as const;
    const criar = { type: "object", additionalProperties: false, required: ["id", ...Object.keys(campos).slice(0, 4)], properties: { id: { type: "string", minLength: 1 }, ...campos } } as const;
    const atualizar = { type: "object", additionalProperties: false, required: ["versao", ...Object.keys(campos)], properties: { versao: { type: "integer", minimum: 1 }, ...campos } } as const;
    const versaoQuery = { type: "object", additionalProperties: false, required: ["versao"], properties: { versao: { type: "integer", minimum: 1 } } } as const;
    const guard = { preHandler: [autenticar, exigirPapeis("GESTOR_ALMOXARIFADO")] };

    app.get("/lotes", { ...guard, schema: { summary: "Lista lotes ativos", description: "Acesso de gestor de almoxarifado e administrador.", tags: ["lotes"], response: respostaLista("#/components/schemas/Lote", "Lotes ativos.") } }, loteController.listar as any);
    app.get("/lotes/periodo", {
        ...guard,
        schema: {
            summary: "Lista lotes ativos recebidos no período",
            description: "Filtra pela data de entrada, incluindo as datas inicial e final.", tags: ["lotes"],
            querystring: {
                type: "object", additionalProperties: false, required: ["dataInicio", "dataFim"],
                properties: { dataInicio: { type: "string", format: "date-time" }, dataFim: { type: "string", format: "date-time" } },
            },
            response: { ...respostaLista("#/components/schemas/Lote", "Lotes recebidos no período."), 400: { description: "Período inválido.", content: { "application/json": { schema: materializarEsquema("#/components/schemas/Erro") } } } },
        },
    }, loteController.listarPorPeriodo as any);
    app.get("/lotes/:id", { ...guard, schema: { summary: "Busca lote e equipamentos ativos", tags: ["lotes"], params, response: respostas("#/components/schemas/Lote", "Lote encontrado com seus equipamentos ativos.") } }, loteController.buscar as any);
    app.post("/lotes", { ...guard, schema: { summary: "Cadastra lote para organização com contrato vigente", description: "O novo lote começa no status RECEBIDO.", tags: ["lotes"], body: criar, response: respostas("#/components/schemas/Lote", "Lote cadastrado.", 201, [400, 401, 403, 404, 409, 500]) } }, loteController.criar as any);
    app.put("/lotes/:id", { ...guard, schema: { summary: "Atualiza os dados do lote", description: "Envie a versão atual; versão desatualizada resulta em 409.", tags: ["lotes"], params, body: atualizar, response: respostas("#/components/schemas/Lote", "Lote atualizado; a versão é incrementada.") } }, loteController.atualizar as any);
    app.patch("/lotes/:id/status", {
        ...guard,
        schema: {
            summary: "Altera manualmente o status do lote; TRIAGEM_CONCLUIDA é automática",
            description: "Status manuais: RECEBIDO, EM_TRIAGEM, ENCAMINHADO e FINALIZADO. TRIAGEM_CONCLUIDA só é atribuída automaticamente quando todos os equipamentos ativos chegam a BAIXA_DEFINITIVA. Envie também a versão atual do lote.", tags: ["lotes"],
            params,
            body: { type: "object", additionalProperties: false, required: ["versao", "status"], properties: { versao: { type: "integer", minimum: 1 }, status: { type: "string", enum: ["RECEBIDO", "EM_TRIAGEM", "ENCAMINHADO", "FINALIZADO"] } } },
            response: respostas("#/components/schemas/Lote", "Status do lote atualizado.", 200, [400, 401, 403, 404, 409, 500]),
        },
    }, loteController.atualizarStatus as any);
    app.delete("/lotes/:id", { ...guard, schema: { summary: "Inativa lote e seus equipamentos", description: "Envie a versão atual em `?versao=`. A inativação incrementa as versões dos equipamentos vinculados.", tags: ["lotes"], params, querystring: versaoQuery, response: respostas("#/components/schemas/Lote", "Lote e equipamentos inativados.") } }, loteController.inativar as any);
    app.patch("/lotes/:id/ativar", { ...guard, schema: { summary: "Reativa lote e seus equipamentos", description: "A organização precisa estar ativa. Envie a versão devolvida quando o lote foi inativado.", tags: ["lotes"], params, body: { type: "object", additionalProperties: false, required: ["versao"], properties: { versao: { type: "integer", minimum: 1 } } }, response: respostas("#/components/schemas/Lote", "Lote e equipamentos reativados.") } }, loteController.ativar as any);
}

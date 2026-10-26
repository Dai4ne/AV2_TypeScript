import type { FastifyInstance } from "fastify";
import type { PapelUsuario } from "@prisma/client";
import { relatorioController } from "../controllers/relatorio.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";
import { respostas } from "./openapi.js";

// Relatórios são consulta e ficam disponíveis aos papéis que os usam na AV1.
export async function registrarRotasRelatorio(app: FastifyInstance): Promise<void> {
    const permissoes: PapelUsuario[] = ["OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"];
    const acesso = { preHandler: [autenticar, exigirPapeis(...permissoes)] };
    const periodo = {
        type: "object", additionalProperties: false, required: ["dataInicio", "dataFim"],
        properties: {
            dataInicio: { type: "string", format: "date-time" },
            dataFim: { type: "string", format: "date-time" },
        },
    } as const;
    const status = ["AGUARDANDO_TRIAGEM", "EM_TRIAGEM", "AGUARDANDO_DESMONTAGEM", "EM_DESMONTAGEM", "PECAS_REAPROVEITADAS", "MATERIAL_RECICLAVEL", "DESCARTE_SEGURO", "BAIXA_DEFINITIVA"];

    app.get("/relatorios/organizacoes/:organizacaoId", {
        ...acesso,
        schema: {
            summary: "Relatório de lotes de uma organização no período",
            description: "Retorna a quantidade e os dados dos lotes ativos cuja data de entrada está dentro do intervalo. A organização precisa existir.", tags: ["relatórios"],
            params: { type: "object", required: ["organizacaoId"], properties: { organizacaoId: { type: "string", minLength: 1 } } },
            querystring: periodo,
            response: respostas("#/components/schemas/RelatorioOrganizacao", "Relatório da organização.", 200, [400, 401, 403, 404, 500]),
        },
    }, relatorioController.porOrganizacao as any);
    app.get("/relatorios/status", {
        ...acesso,
        schema: {
            summary: "Conta equipamentos ativos por status de rastreamento",
            description: "A contagem considera somente equipamentos ativos.", tags: ["relatórios"],
            querystring: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: status } } },
            response: respostas("#/components/schemas/RelatorioStatus", "Quantidade de equipamentos para o status informado.", 200, [400, 401, 403, 500]),
        },
    }, relatorioController.porStatus as any);
    app.get("/relatorios/financeiro", {
        ...acesso,
        schema: { summary: "Soma valores mensais dos contratos vigentes no período", description: "Inclui contratos ativos cujo período de vigência se sobrepõe ao intervalo consultado.", tags: ["relatórios"], querystring: periodo, response: respostas("#/components/schemas/RelatorioFinanceiro", "Resumo financeiro do período.", 200, [400, 401, 403, 500]) },
    }, relatorioController.financeiro as any);
    app.get("/lotes/:id/relatorio-triagem", {
        ...acesso,
        schema: {
            summary: "Resumo de triagem com quantidade, peso e status dos equipamentos ativos",
            description: "Mostra quantidade, peso total em quilogramas e contagem de equipamentos ativos por status.", tags: ["relatórios"],
            params: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } },
            response: respostas("#/components/schemas/RelatorioTriagem", "Resumo de triagem do lote.", 200, [401, 403, 404, 500]),
        },
    }, relatorioController.triagem as any);
}

import type { FastifyInstance } from "fastify";
import type { PapelUsuario } from "@prisma/client";
import { relatorioController } from "../controllers/relatorio.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";

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
            params: { type: "object", required: ["organizacaoId"], properties: { organizacaoId: { type: "string", minLength: 1 } } },
            querystring: periodo,
        },
    }, relatorioController.porOrganizacao as any);
    app.get("/relatorios/status", {
        ...acesso,
        schema: {
            summary: "Conta equipamentos ativos por status de rastreamento",
            querystring: { type: "object", required: ["status"], properties: { status: { type: "string", enum: status } } },
        },
    }, relatorioController.porStatus as any);
    app.get("/relatorios/financeiro", {
        ...acesso,
        schema: { summary: "Soma valores mensais dos contratos vigentes no período", querystring: periodo },
    }, relatorioController.financeiro as any);
    app.get("/lotes/:id/relatorio-triagem", {
        ...acesso,
        schema: {
            summary: "Resumo de triagem com quantidade, peso e status dos equipamentos ativos",
            params: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } },
        },
    }, relatorioController.triagem as any);
}

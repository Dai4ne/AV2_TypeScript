import type { FastifyInstance } from "fastify";
import { organizacaoController } from "../controllers/organizacao.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";

// Registra o CRUD de organizações; o administrador também é liberado pelo controle de papéis.
export async function registrarRotasOrganizacao(app: FastifyInstance): Promise<void> {
    const params = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
    const campos = {
        razaoSocial: { type: "string", minLength: 1 }, cnpj: { type: "string", minLength: 14, maxLength: 18 },
        inscricaoEstadual: { type: "string", minLength: 1 }, enderecoCompleto: { type: "string", minLength: 1 },
        telefone: { type: "string", minLength: 1 }, email: { type: "string", minLength: 3 },
    } as const;
    const criar = { type: "object", additionalProperties: false, required: ["id", ...Object.keys(campos)], properties: { id: { type: "string", minLength: 1 }, ...campos } } as const;
    const editar = { type: "object", additionalProperties: false, required: Object.keys(campos), properties: campos } as const;
    const cadastro = { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")] };

    app.get("/organizacoes", { ...cadastro, schema: { summary: "Lista organizações ativas" } }, organizacaoController.listar as any);
    app.get("/organizacoes/:id", { ...cadastro, schema: { summary: "Busca organização", params } }, organizacaoController.buscar as any);
    app.post("/organizacoes", { ...cadastro, schema: { summary: "Cadastra organização", body: criar } }, organizacaoController.criar as any);
    app.put("/organizacoes/:id", { ...cadastro, schema: { summary: "Atualiza organização", params, body: editar } }, organizacaoController.atualizar as any);
    app.delete("/organizacoes/:id", { ...cadastro, schema: { summary: "Inativa organização e lotes/equipamentos em cadeia", params } }, organizacaoController.inativar as any);
    app.patch("/organizacoes/:id/ativar", { ...cadastro, schema: { summary: "Reativa organização", params } }, organizacaoController.ativar as any);
}

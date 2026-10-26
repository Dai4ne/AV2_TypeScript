import type { FastifyInstance } from "fastify";
import { organizacaoController } from "../controllers/organizacao.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";
import { respostaLista, respostas } from "./openapi.js";

// Registra o CRUD de organizações; o administrador também é liberado pelo controle de papéis.
export async function registrarRotasOrganizacao(app: FastifyInstance): Promise<void> {
    const params = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
    const campos = {
        razaoSocial: { type: "string", minLength: 1 }, cnpj: { type: "string", minLength: 14, maxLength: 18 },
        inscricaoEstadual: { type: "string", minLength: 1 }, enderecoCompleto: { type: "string", minLength: 1 },
        telefone: { type: "string", minLength: 1 }, email: { type: "string", format: "email" },
    } as const;
    const criar = { type: "object", additionalProperties: false, required: ["id", ...Object.keys(campos)], properties: { id: { type: "string", minLength: 1 }, ...campos } } as const;
    const editar = { type: "object", additionalProperties: false, required: ["versao", ...Object.keys(campos)], properties: { versao: { type: "integer", minimum: 1 }, ...campos } } as const;
    const versaoQuery = { type: "object", additionalProperties: false, required: ["versao"], properties: { versao: { type: "integer", minimum: 1 } } } as const;
    const cadastro = { preHandler: [autenticar, exigirPapeis("OPERADOR_CADASTRO")] };

    app.get("/organizacoes", { ...cadastro, schema: { summary: "Lista organizações ativas", tags: ["organizações"], response: respostaLista("#/components/schemas/Organizacao", "Organizações ativas.") } }, organizacaoController.listar as any);
    app.get("/organizacoes/:id", { ...cadastro, schema: { summary: "Busca uma organização ativa pelo ID", tags: ["organizações"], params, response: respostas("#/components/schemas/Organizacao", "Organização encontrada.") } }, organizacaoController.buscar as any);
    app.post("/organizacoes", { ...cadastro, schema: { summary: "Cadastra organização", description: "CNPJ e e-mail devem ser válidos e únicos. E-mail é normalizado para minúsculas.", tags: ["organizações"], body: criar, response: respostas("#/components/schemas/Organizacao", "Organização cadastrada.", 201, [400, 401, 403, 409, 500]) } }, organizacaoController.criar as any);
    app.put("/organizacoes/:id", { ...cadastro, schema: { summary: "Atualiza organização", description: "Inclua a versão recebida na consulta. Versão desatualizada resulta em 409.", tags: ["organizações"], params, body: editar, response: respostas("#/components/schemas/Organizacao", "Organização atualizada; a versão é incrementada.") } }, organizacaoController.atualizar as any);
    app.delete("/organizacoes/:id", { ...cadastro, schema: { summary: "Inativa organização e seus lotes/equipamentos em cadeia", description: "Envie a versão atual em `?versao=`. Também inativa os filhos e incrementa suas versões.", tags: ["organizações"], params, querystring: versaoQuery, response: respostas("#/components/schemas/Organizacao", "Organização e filhos inativados.") } }, organizacaoController.inativar as any);
    app.patch("/organizacoes/:id/ativar", { ...cadastro, schema: { summary: "Reativa organização e seus lotes/equipamentos", description: "Informe no corpo a versão devolvida pela inativação ou por consulta anterior.", tags: ["organizações"], params, body: { type: "object", additionalProperties: false, required: ["versao"], properties: { versao: { type: "integer", minimum: 1, description: "Versão atual da organização." } } }, response: respostas("#/components/schemas/Organizacao", "Organização e filhos reativados.") } }, organizacaoController.ativar as any);
}

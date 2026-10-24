import type { FastifyInstance } from "fastify";
import { usuarioController } from "../controllers/usuario.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";

// Somente administradores mantêm contas; usuários também podem trocar a própria senha.
export async function registrarRotasUsuario(app: FastifyInstance): Promise<void> {
    const params = { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1 } } } as const;
    const papeis = ["ADMINISTRADOR", "OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"];
    const cadastro = { type: "object", additionalProperties: false, required: ["usuario", "senha", "papel"], properties: {
        usuario: { type: "string", minLength: 1 }, senha: { type: "string", minLength: 1 }, papel: { type: "string", enum: papeis },
    } } as const;
    const atualizacao = { type: "object", additionalProperties: false, required: ["usuario", "papel"], properties: {
        usuario: { type: "string", minLength: 1 }, papel: { type: "string", enum: papeis },
    } } as const;
    const admin = { preHandler: [autenticar, exigirPapeis("ADMINISTRADOR")] };

    app.get("/usuarios", { ...admin, schema: { summary: "Lista usuários ativos" } }, usuarioController.listar as any);
    app.get("/usuarios/:id", { ...admin, schema: { summary: "Busca usuário", params } }, usuarioController.buscar as any);
    app.post("/usuarios", { ...admin, schema: { summary: "Cadastra usuário", body: cadastro } }, usuarioController.criar as any);
    app.put("/usuarios/:id", { ...admin, schema: { summary: "Atualiza nome e papel", params, body: atualizacao } }, usuarioController.atualizar as any);
    app.delete("/usuarios/:id", { ...admin, schema: { summary: "Inativa usuário", params } }, usuarioController.inativar as any);
    app.patch("/usuarios/:id/ativar", { ...admin, schema: { summary: "Reativa usuário", params } }, usuarioController.ativar as any);
    app.patch("/usuarios/:id/senha", {
        preHandler: [autenticar],
        schema: { summary: "Troca a própria senha ou permite redefinição pelo administrador", params, body: {
            type: "object", additionalProperties: false, required: ["senha"],
            properties: { senha: { type: "string", minLength: 1 }, senhaAtual: { type: "string" } },
        } },
    }, usuarioController.alterarSenha as any);
}

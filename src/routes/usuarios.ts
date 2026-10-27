import type { FastifyInstance } from "fastify";
import { usuarioController } from "../controllers/usuario.controller.js";
import { autenticar, exigirPapeis } from "../plugins/auth.js";
import { respostaLista, respostas } from "./openapi.js";

// Somente aDministradores mantêm contas; usuários também podem trocar a própria senha.
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

    app.get("/usuarios", { ...admin, schema: { summary: "Lista usuários ativos", description: "Acesso exclusivo de administrador. Senhas e hashes nunca são retornados.", tags: ["usuários"], response: respostaLista("#/components/schemas/Usuario", "Usuários ativos.") } }, usuarioController.listar as any);
    app.get("/usuarios/papel/:papel", { ...admin, schema: {
        summary: "Lista usuários ativos com o papel informado",
        description: "Acesso exclusivo de administrador. Papéis aceitos: ADMINISTRADOR, OPERADOR_CADASTRO, GESTOR_ALMOXARIFADO e AUDITOR.", tags: ["usuários"],
        params: { type: "object", required: ["papel"], properties: { papel: { type: "string", enum: papeis } } },
        response: respostaLista("#/components/schemas/Usuario", "Usuários ativos que possuem o papel indicado."),
    } }, usuarioController.listarPorPapel as any);
    app.get("/usuarios/:id", { ...admin, schema: { summary: "Busca usuário ativo pelo ID", tags: ["usuários"], params, response: respostas("#/components/schemas/Usuario", "Usuário encontrado.") } }, usuarioController.buscar as any);
    app.post("/usuarios", { ...admin, schema: { summary: "Cadastra usuário", description: "Cria uma conta com o papel escolhido. A senha é armazenada com hash e salt.", tags: ["usuários"], body: cadastro, response: respostas("#/components/schemas/Usuario", "Usuário cadastrado.", 201, [400, 401, 403, 409, 500]) } }, usuarioController.criar as any);
    app.put("/usuarios/:id", { ...admin, schema: { summary: "Atualiza nome de usuário e papel", description: "Não permite rebaixar o último administrador ativo.", tags: ["usuários"], params, body: atualizacao, response: respostas("#/components/schemas/Usuario", "Usuário atualizado.", 200, [400, 401, 403, 404, 409, 500]) } }, usuarioController.atualizar as any);
    app.delete("/usuarios/:id", { ...admin, schema: { summary: "Inativa usuário", description: "Não permite inativar o último administrador ativo.", tags: ["usuários"], params, response: respostas("#/components/schemas/Usuario", "Usuário inativado.", 200, [401, 403, 404, 409, 500]) } }, usuarioController.inativar as any);
    app.patch("/usuarios/:id/ativar", { ...admin, schema: { summary: "Reativa usuário", tags: ["usuários"], params, response: respostas("#/components/schemas/Usuario", "Usuário reativado.", 200, [401, 403, 404, 500]) } }, usuarioController.ativar as any);
    app.patch("/usuarios/:id/senha", {
        preHandler: [autenticar],
        schema: { summary: "Troca a própria senha ou redefine a senha de outro usuário como administrador", description: "Para a própria conta, envie senhaAtual e senha. Administrador redefinindo outra conta envia apenas senha.", tags: ["usuários"], params, body: {
            type: "object", additionalProperties: false, required: ["senha"],
            properties: { senha: { type: "string", minLength: 1 }, senhaAtual: { type: "string" } },
        }, response: respostas("#/components/schemas/Mensagem", "Senha alterada.", 200, [400, 401, 403, 404, 500]) },
    }, usuarioController.alterarSenha as any);
}

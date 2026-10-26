import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { configuracao } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { registrarRotaSaude } from "./routes/health.js";
import { registrarRotasOrganizacao } from "./routes/organizacoes.js";
import { registrarRotasLote } from "./routes/lotes.js";
import { registrarRotasContrato } from "./routes/contratos.js";
import { registrarRotasEquipamento } from "./routes/equipamentos.js";
import { registrarRotasUsuario } from "./routes/usuarios.js";
import { registrarRotasAuth } from "./routes/auth.js";
import { registrarRotasRelatorio } from "./routes/relatorios.js";
import { esquemasOpenApi } from "./routes/openapi.js";

// Monta o servidor, plugins e todos os grupos de rotas.
export async function criarAplicacao() {
    const app = Fastify({ logger: true });
    await app.register(fastifyJwt, { secret: configuracao.jwtSecret });
    await app.register(fastifySwagger, {
        openapi: {
            info: { title: "GreenCode API", description: "API REST de logística reversa de eletrônicos. Rotas protegidas exigem JWT Bearer. O administrador acessa todas as rotas protegidas; os demais papéis seguem as permissões descritas em cada grupo.", version: "1.0.0" },
            components: {
                securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
                schemas: esquemasOpenApi as any,
            },
            tags: [
                { name: "autenticação", description: "Login e emissão de token JWT, válido por 30 minutos." },
                { name: "saúde", description: "Verifica disponibilidade da API e conexão PostgreSQL." },
                { name: "usuários", description: "Administração de contas; somente o administrador gerencia contas, e cada usuário pode trocar sua senha." },
                { name: "organizações", description: "Operações de organizações; operador de cadastro e administrador." },
                { name: "contratos", description: "Operações de contratos; operador de cadastro e administrador." },
                { name: "lotes", description: "Operações de lotes; gestor de almoxarifado e administrador." },
                { name: "equipamentos", description: "Cadastro e rastreamento; gestor de almoxarifado e administrador. Auditor pode consultar." },
                { name: "movimentações", description: "Histórico de movimentações; gestor registra, gestor e auditor consultam." },
                { name: "relatórios", description: "Relatórios de lotes, status, triagem e contratos; todos os papéis operacionais e administrador." },
            ],
            security: [{ bearerAuth: [] }],
        },
    });
    await app.register(fastifySwaggerUi, { routePrefix: "/docs" });
    await registrarRotaSaude(app);
    await registrarRotasAuth(app);
    await registrarRotasRelatorio(app);
    await registrarRotasUsuario(app);
    await registrarRotasOrganizacao(app);
    await registrarRotasContrato(app);
    await registrarRotasLote(app);
    await registrarRotasEquipamento(app);
    app.addHook("onClose", async () => { await prisma.$disconnect(); });
    return app;
}

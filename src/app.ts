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

// Monta o servidor, plugins e todos os grupos de rotas.
export async function criarAplicacao() {
    const app = Fastify({ logger: true });
    await app.register(fastifyJwt, { secret: configuracao.jwtSecret });
    await app.register(fastifySwagger, {
        openapi: {
            info: { title: "GreenCode API", description: "API de logística reversa de eletrônicos.", version: "1.0.0" },
            components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
            security: [{ bearerAuth: [] }],
        },
    });
    await app.register(fastifySwaggerUi, { routePrefix: "/docs" });
    await registrarRotaSaude(app);
    await registrarRotasAuth(app);
    await registrarRotasUsuario(app);
    await registrarRotasOrganizacao(app);
    await registrarRotasContrato(app);
    await registrarRotasLote(app);
    await registrarRotasEquipamento(app);
    app.addHook("onClose", async () => { await prisma.$disconnect(); });
    return app;
}

import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { configuracao } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { registrarRotaSaude } from "./routes/health.js";

// Monta o servidor e registra recursos compartilhados pela API.
export async function criarAplicacao() {
    const app = Fastify({ logger: true });

    await app.register(fastifyJwt, { secret: configuracao.jwtSecret });
    await app.register(fastifySwagger, {
        openapi: {
            info: {
                title: "GreenCode API",
                description: "API de logística reversa de eletrônicos.",
                version: "1.0.0",
            },
        },
    });
    await app.register(fastifySwaggerUi, { routePrefix: "/docs" });
    await registrarRotaSaude(app);

    // Libera a conexão do banco quando o servidor for encerrado.
    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });

    return app;
}
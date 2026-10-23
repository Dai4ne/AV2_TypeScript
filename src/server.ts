import { criarAplicacao } from "./app.js";
import { configuracao } from "./config/env.js";

// Inicializa o servidor usando os valores do arquivo .env.
const app = await criarAplicacao();

try {
    await app.listen({ host: configuracao.host, port: configuracao.port });
} catch (erro) {
    app.log.error(erro);
    await app.close();
    process.exitCode = 1;
}

// Fecha conexões abertas quando a pessoa encerrar com Ctrl+C.
let encerrando = false;
async function encerrar(): Promise<void> {
    if (encerrando) return;
    encerrando = true;
    await app.close();
}

process.once("SIGINT", () => void encerrar());
process.once("SIGTERM", () => void encerrar());
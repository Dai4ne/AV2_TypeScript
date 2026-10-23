import "dotenv/config";

// Lê configurações do ambiente e interrompe a inicialização se forem inválidas.
function lerPorta(valor: string | undefined): number {
    const porta = valor === undefined ? 3000 : Number(valor);
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
        throw new Error("PORT precisa ser um número de 1 a 65535.");
    }
    return porta;
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("Defina JWT_SECRET com pelo menos 32 caracteres no arquivo .env.");
}

export const configuracao = {
    host: process.env.HOST ?? "127.0.0.1",
    port: lerPorta(process.env.PORT),
    jwtSecret,
};
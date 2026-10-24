import { saudeRepository } from "../repositories/saude.repository.js";

// Delega a verificação da conexão ao repositório.
export const saudeService = {
    verificarBanco() {
        return saudeRepository.verificarBanco();
    },
};

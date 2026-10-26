import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

// A suíte exige um banco separado para não tocar nos dados de desenvolvimento.
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("Defina TEST_DATABASE_URL apontando para um banco de teste.");
const nomeBanco = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
if (!nomeBanco.toLowerCase().includes("test")) {
    throw new Error("Por segurança, o nome do banco em TEST_DATABASE_URL precisa conter 'test'.");
}
process.env.DATABASE_URL = databaseUrl;

const identificadorExecucao = randomUUID().slice(0, 8);
const prefixoUsuario = `TEST-${identificadorExecucao}`;
const senhaAdmin = `Teste-${randomBytes(10).toString("hex")}`;
const adminNome = `${prefixoUsuario}-ADMIN`;
const dadosUsuarios: string[] = [];
const organizacoes: string[] = [];
let app: import("fastify").FastifyInstance;
let prisma: typeof import("../src/database/prisma.js").prisma;
let adminId = "";

before(async () => {
    // Importa depois de apontar DATABASE_URL para o banco exclusivo de testes.
    const banco = await import("../src/database/prisma.js");
    const servidor = await import("../src/app.js");
    prisma = banco.prisma;
    app = await servidor.criarAplicacao();
    await app.ready();

    const salt = randomBytes(16).toString("hex");
    const hashSenha = createHash("sha256").update(senhaAdmin + salt).digest("hex");
    const administrador = await prisma.usuario.create({
        data: { usuario: adminNome, salt, hashSenha, papel: "ADMINISTRADOR" },
    });
    adminId = administrador.id;
    dadosUsuarios.push(adminNome);
});

after(async () => {
    // Remove somente os registros identificados por este teste.
    if (prisma) {
        const lotes = await prisma.lote.findMany({ where: { organizacaoId: { in: organizacoes } }, select: { id: true } });
        const loteIds = lotes.map((lote) => lote.id);
        const equipamentos = await prisma.equipamento.findMany({ where: { loteId: { in: loteIds } }, select: { id: true } });
        const equipamentoIds = equipamentos.map((item) => item.id);
        await prisma.$transaction(async (tx) => {
            await tx.movimentacao.deleteMany({ where: { equipamentoId: { in: equipamentoIds } } });
            await tx.equipamento.deleteMany({ where: { id: { in: equipamentoIds } } });
            await tx.lote.deleteMany({ where: { id: { in: loteIds } } });
            await tx.contrato.deleteMany({ where: { organizacaoId: { in: organizacoes } } });
            await tx.organizacao.deleteMany({ where: { id: { in: organizacoes } } });
            await tx.usuario.deleteMany({ where: { usuario: { in: dadosUsuarios } } });
        });
    }
    if (app) await app.close();
});

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
async function chamar(metodo: Metodo, url: string, token?: string, corpo?: unknown) {
    const resposta: any = await (app.inject as any)({
        method: metodo,
        url,
        ...(corpo === undefined ? {} : { payload: corpo }),
        headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return {
        status: resposta.statusCode,
        dados: resposta.body ? JSON.parse(resposta.body) as any : undefined,
    };
}

function novoCnpj(): string {
    const base = `${Date.now().toString().slice(-8)}${String(randomBytes(2).readUInt16BE() % 10_000).padStart(4, "0")}`;
    const calcularDigito = (valor: string, pesos: number[]) => {
        const soma = [...valor].reduce((total, caractere, indice) => total + Number(caractere) * pesos[indice], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const primeiro = calcularDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const segundo = calcularDigito(`${base}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return `${base}${primeiro}${segundo}`;
}

test("fluxos principais, permissões, regras e conflitos de versão da API", async () => {
    const health = await chamar("GET", "/health");
    assert.equal(health.status, 200, "API e PostgreSQL devem responder");
    assert.equal((await chamar("GET", "/organizacoes")).status, 401, "rota protegida deve exigir token");

    const loginAdmin = await chamar("POST", "/auth/login", undefined, { usuario: adminNome, senha: senhaAdmin });
    assert.equal(loginAdmin.status, 200);
    const tokenAdmin = loginAdmin.dados.token as string;
    assert.ok(tokenAdmin);
    assert.equal((await chamar("POST", "/auth/login", undefined, { usuario: adminNome, senha: "senha-incorreta" })).status, 401);
    assert.equal((await chamar("GET", "/organizacoes", "token-invalido")).status, 401);

    // Prepara os três papéis operacionais através do CRUD de usuários.
    const tokens: Record<string, string> = { ADMINISTRADOR: tokenAdmin };
    const idsUsuario: Record<string, string> = {};
    for (const papel of ["OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"] as const) {
        const nome = `${prefixoUsuario}-${papel}`;
        dadosUsuarios.push(nome);
        const criado = await chamar("POST", "/usuarios", tokenAdmin, { usuario: nome, senha: "Senha-teste-123", papel });
        assert.equal(criado.status, 201, `deve criar usuário ${papel}`);
        idsUsuario[papel] = criado.dados.id;
        const login = await chamar("POST", "/auth/login", undefined, { usuario: nome, senha: "Senha-teste-123" });
        assert.equal(login.status, 200, `usuário ${papel} deve conseguir entrar`);
        tokens[papel] = login.dados.token;
    }
    assert.equal((await chamar("GET", "/usuarios/papel/AUDITOR", tokenAdmin)).status, 200);
    assert.equal((await chamar("GET", "/usuarios", tokens.AUDITOR)).status, 403, "auditor não administra contas");
    assert.equal((await chamar("GET", "/lotes", tokens.OPERADOR_CADASTRO)).status, 403, "operador não gerencia lotes");
    assert.equal((await chamar("GET", `/usuarios/${idsUsuario.AUDITOR}`, tokenAdmin)).status, 200);
    const nomeAuditorAtualizado = `${prefixoUsuario}-AUDITOR-ATUALIZADO`;
    dadosUsuarios.push(nomeAuditorAtualizado);
    assert.equal((await chamar("PUT", `/usuarios/${idsUsuario.AUDITOR}`, tokenAdmin, { usuario: nomeAuditorAtualizado, papel: "AUDITOR" })).status, 200);
    assert.equal((await chamar("DELETE", `/usuarios/${idsUsuario.AUDITOR}`, tokenAdmin)).status, 200);
    assert.equal((await chamar("PATCH", `/usuarios/${idsUsuario.AUDITOR}/ativar`, tokenAdmin)).status, 200);
    const senhaPropriaAlterada = await chamar("PATCH", `/usuarios/${idsUsuario.AUDITOR}/senha`, tokens.AUDITOR, { senhaAtual: "Senha-teste-123", senha: "NovaSenha-teste-123" });
    assert.equal(senhaPropriaAlterada.status, 200);
    let novoLoginAuditor = await chamar("POST", "/auth/login", undefined, { usuario: nomeAuditorAtualizado, senha: "NovaSenha-teste-123" });
    assert.equal(novoLoginAuditor.status, 200);
    tokens.AUDITOR = novoLoginAuditor.dados.token;
    assert.equal((await chamar("PATCH", `/usuarios/${idsUsuario.AUDITOR}/senha`, tokenAdmin, { senha: "Senha-redefinida-123" })).status, 200);
    novoLoginAuditor = await chamar("POST", "/auth/login", undefined, { usuario: nomeAuditorAtualizado, senha: "Senha-redefinida-123" });
    assert.equal(novoLoginAuditor.status, 200, "administrador deve conseguir redefinir senha");
    tokens.AUDITOR = novoLoginAuditor.dados.token;
    assert.equal((await chamar("DELETE", `/usuarios/${adminId}`, tokenAdmin)).status, 409, "último administrador não pode ser inativado");

    // Organização e contrato: cadastro, unicidade, atualização e conflito de versão.
    const orgId = `${prefixoUsuario}-ORG`;
    const email = `${identificadorExecucao}@example.test`;
    organizacoes.push(orgId);
    const org = {
        id: orgId, razaoSocial: "Organização de Teste Automatizado", cnpj: novoCnpj(),
        inscricaoEstadual: "ISENTO", enderecoCompleto: "Rua de Teste, 1", telefone: "11999990000", email,
    };
    const orgCriada = await chamar("POST", "/organizacoes", tokens.OPERADOR_CADASTRO, org);
    assert.equal(orgCriada.status, 201);
    assert.equal((await chamar("GET", "/organizacoes", tokens.OPERADOR_CADASTRO)).status, 200);
    assert.equal((await chamar("GET", `/organizacoes/${orgId}`, tokens.OPERADOR_CADASTRO)).status, 200);
    const orgVersaoInicial = orgCriada.dados.versao as number;
    assert.equal((await chamar("POST", "/organizacoes", tokens.OPERADOR_CADASTRO, { ...org, id: `${orgId}-EMAIL`, cnpj: novoCnpj() })).status, 409, "e-mail duplicado deve ser recusado");
    assert.equal((await chamar("POST", "/organizacoes", tokens.OPERADOR_CADASTRO, { ...org, id: `${orgId}-CNPJ`, email: `outro-${email}`, razaoSocial: "Outra organização" })).status, 409, "CNPJ duplicado deve ser recusado");

    const orgAtualizada = await chamar("PUT", `/organizacoes/${orgId}`, tokens.OPERADOR_CADASTRO, {
        versao: orgVersaoInicial, razaoSocial: org.razaoSocial, cnpj: org.cnpj,
        inscricaoEstadual: org.inscricaoEstadual, enderecoCompleto: "Rua de Teste, 2", telefone: org.telefone, email: org.email,
    });
    assert.equal(orgAtualizada.status, 200);
    assert.equal((await chamar("PUT", `/organizacoes/${orgId}`, tokens.OPERADOR_CADASTRO, {
        versao: orgVersaoInicial, razaoSocial: org.razaoSocial, cnpj: org.cnpj,
        inscricaoEstadual: org.inscricaoEstadual, enderecoCompleto: org.enderecoCompleto, telefone: org.telefone, email: org.email,
    })).status, 409, "versão antiga deve ser recusada");

    const contratoId = `${prefixoUsuario}-CONTRATO`;
    const contratoCriado = await chamar("POST", "/contratos", tokens.OPERADOR_CADASTRO, {
        organizacaoId: orgId, dataAssinatura: new Date(Date.now() - 86_400_000).toISOString(),
        dataVencimento: new Date(Date.now() + 365 * 86_400_000).toISOString(), clausulas: ["Contrato de teste"],
        valorMensal: 1234.5, renovacaoAutomatica: false,
    });
    assert.equal(contratoCriado.status, 201);
    assert.equal((await chamar("GET", "/contratos", tokens.OPERADOR_CADASTRO)).status, 200);
    assert.equal((await chamar("GET", `/contratos/${contratoCriado.dados.id}`, tokens.OPERADOR_CADASTRO)).status, 200);
    assert.equal((await chamar("POST", "/contratos", tokens.OPERADOR_CADASTRO, {
        organizacaoId: orgId, dataAssinatura: contratoCriado.dados.dataAssinatura,
        dataVencimento: contratoCriado.dados.dataVencimento, clausulas: ["Duplicado"], valorMensal: 1, renovacaoAutomatica: false,
    })).status, 409, "organização não pode ter um segundo contrato");
    const contratoAtualizado = await chamar("PUT", `/contratos/${contratoCriado.dados.id}`, tokens.OPERADOR_CADASTRO, {
        versao: contratoCriado.dados.versao, dataAssinatura: contratoCriado.dados.dataAssinatura,
        dataVencimento: contratoCriado.dados.dataVencimento, clausulas: ["Contrato alterado"], valorMensal: 1300, renovacaoAutomatica: false,
    });
    assert.equal(contratoAtualizado.status, 200);
    assert.equal((await chamar("PUT", `/contratos/${contratoCriado.dados.id}`, tokens.OPERADOR_CADASTRO, {
        versao: contratoCriado.dados.versao, dataAssinatura: contratoCriado.dados.dataAssinatura,
        dataVencimento: contratoCriado.dados.dataVencimento, clausulas: ["Dados antigos"], valorMensal: 1, renovacaoAutomatica: false,
    })).status, 409);

    // Organização com contrato expirado não deve aceitar lote.
    const orgExpiradaId = `${prefixoUsuario}-EXPIRADA`;
    organizacoes.push(orgExpiradaId);
    const orgExpirada = await chamar("POST", "/organizacoes", tokens.OPERADOR_CADASTRO, {
        ...org, id: orgExpiradaId, razaoSocial: "Organização com contrato expirado", cnpj: novoCnpj(), email: `expirada-${email}`,
    });
    assert.equal(orgExpirada.status, 201);
    const contratoExpirado = await chamar("POST", "/contratos", tokens.OPERADOR_CADASTRO, {
        organizacaoId: orgExpiradaId, dataAssinatura: "2020-01-01T12:00:00.000Z", dataVencimento: "2021-01-01T12:00:00.000Z",
        clausulas: ["Expirado"], valorMensal: 10, renovacaoAutomatica: false,
    });
    assert.equal(contratoExpirado.status, 201);
    assert.equal((await chamar("POST", "/lotes", tokens.GESTOR_ALMOXARIFADO, {
        id: `${prefixoUsuario}-LOTE-BLOQUEADO`, dataEntrada: new Date().toISOString(), organizacaoId: orgExpiradaId,
        notaFiscal: "NF-EXP", transportadora: "Transportadora Teste",
    })).status, 409, "contrato expirado deve impedir lote");

    // Lote e equipamentos: versão do lote, justificativa e histórico rastreável.
    const loteId = `${prefixoUsuario}-LOTE`;
    const loteCriado = await chamar("POST", "/lotes", tokens.GESTOR_ALMOXARIFADO, {
        id: loteId, dataEntrada: new Date().toISOString(), organizacaoId: orgId, notaFiscal: "NF-TESTE", transportadora: "Transportadora Teste",
    });
    assert.equal(loteCriado.status, 201);
    assert.equal(loteCriado.dados.statusProcessamento, "RECEBIDO", "lote deve iniciar como RECEBIDO");

    const loteEditado = await chamar("PUT", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO, {
        versao: loteCriado.dados.versao, dataEntrada: loteCriado.dados.dataEntrada, organizacaoId: orgId,
        notaFiscal: "NF-TESTE-EDITADA", transportadora: "Transportadora Teste", observacoes: "Teste automatizado",
    });
    assert.equal(loteEditado.status, 200);
    assert.equal((await chamar("PUT", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO, {
        versao: loteCriado.dados.versao, dataEntrada: loteCriado.dados.dataEntrada, organizacaoId: orgId,
        notaFiscal: "NF-ANTIGA", transportadora: "Transportadora Teste", observacoes: "Versão antiga",
    })).status, 409, "atualização concorrente de lote deve ser recusada");

    const statusManualLote = await chamar("PATCH", `/lotes/${loteId}/status`, tokens.GESTOR_ALMOXARIFADO, { versao: loteEditado.dados.versao, status: "EM_TRIAGEM" });
    assert.equal(statusManualLote.status, 200);
    assert.equal((await chamar("GET", "/lotes", tokens.GESTOR_ALMOXARIFADO)).status, 200);
    const inicioLotes = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const fimLotes = new Date(Date.now() + 2 * 86_400_000).toISOString();
    assert.equal((await chamar("GET", `/lotes/periodo?dataInicio=${encodeURIComponent(inicioLotes)}&dataFim=${encodeURIComponent(fimLotes)}`, tokens.GESTOR_ALMOXARIFADO)).status, 200);

    const criarEquipamento = async (id: string, versaoLote: number) => chamar("POST", "/equipamentos", tokens.GESTOR_ALMOXARIFADO, {
        id, loteId, versaoLote, tipo: "NOTEBOOK", marca: "Teste", modelo: "Modelo A", anoFabricacao: 2022,
        estadoFisico: "NOVO", pesoQuilogramas: 1.1,
    });
    const equipamento1Id = `${prefixoUsuario}-EQ1`;
    const equipamento1 = await criarEquipamento(equipamento1Id, loteEditado.dados.versao);
    assert.equal(equipamento1.status, 201);
    assert.equal(equipamento1.dados.codigoBarrasInterno, equipamento1Id, "código de barras deve ser igual ao ID");
    assert.equal((await criarEquipamento(`${prefixoUsuario}-EQ-STALE`, loteEditado.dados.versao)).status, 409, "versão antiga do lote deve impedir novo equipamento");

    const loteAtual = (await chamar("GET", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO)).dados;
    assert.equal((await chamar("GET", "/equipamentos", tokens.GESTOR_ALMOXARIFADO)).status, 200);
    const equipamento2Id = `${prefixoUsuario}-EQ2`;
    const equipamento2 = await criarEquipamento(equipamento2Id, loteAtual.versao);
    assert.equal(equipamento2.status, 201);
    assert.equal((await chamar("POST", `/equipamentos/${equipamento1Id}/movimentacoes`, tokens.GESTOR_ALMOXARIFADO, {
        origem: "Recebimento", destino: "Área de teste", observacao: "Movimentação manual de teste",
    })).status, 201);

    const alterarEstado = (versao: number, justificativa?: string) => chamar("PUT", `/equipamentos/${equipamento1Id}`, tokens.GESTOR_ALMOXARIFADO, {
        versao, tipo: "NOTEBOOK", marca: "Teste", modelo: "Modelo A", anoFabricacao: 2022,
        estadoFisico: "DANIFICADO_GRAVE", pesoQuilogramas: 1.1, ...(justificativa ? { justificativa } : {}),
    });
    assert.equal((await alterarEstado(equipamento1.dados.versao)).status, 400, "piora de várias categorias exige justificativa");
    const estadoComJustificativa = await alterarEstado(equipamento1.dados.versao, "Dano identificado no teste automatizado");
    assert.equal(estadoComJustificativa.status, 200);
    assert.equal((await alterarEstado(equipamento1.dados.versao, "Versão obsoleta")).status, 409, "versão antiga do equipamento deve ser recusada");

    const historico = await chamar("GET", `/equipamentos/${equipamento1Id}/movimentacoes`, tokens.AUDITOR);
    assert.equal(historico.status, 200);
    assert.ok(historico.dados.some((mov: { observacao: string }) => mov.observacao.includes("Dano identificado no teste automatizado")), "justificativa deve ficar no histórico");
    assert.equal((await chamar("PATCH", `/equipamentos/${equipamento1Id}/status`, tokens.AUDITOR, { versao: estadoComJustificativa.dados.versao, status: "BAIXA_DEFINITIVA" })).status, 403, "auditor não deve alterar status");

    const eq1Baixa = await chamar("PATCH", `/equipamentos/${equipamento1Id}/status`, tokens.GESTOR_ALMOXARIFADO, { versao: estadoComJustificativa.dados.versao, status: "BAIXA_DEFINITIVA" });
    assert.equal(eq1Baixa.status, 200);
    const eq2Baixa = await chamar("PATCH", `/equipamentos/${equipamento2Id}/status`, tokens.GESTOR_ALMOXARIFADO, { versao: equipamento2.dados.versao, status: "BAIXA_DEFINITIVA" });
    assert.equal(eq2Baixa.status, 200);
    const loteConcluido = (await chamar("GET", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO)).dados;
    assert.equal(loteConcluido.statusProcessamento, "TRIAGEM_CONCLUIDA", "todos os equipamentos em baixa devem concluir a triagem do lote");

    // Relatórios devem incluir os registros criados durante a execução.
    const inicio = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const fim = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const relatorioOrg = await chamar("GET", `/relatorios/organizacoes/${orgId}?dataInicio=${encodeURIComponent(inicio)}&dataFim=${encodeURIComponent(fim)}`, tokens.AUDITOR);
    assert.equal(relatorioOrg.status, 200);
    assert.ok(relatorioOrg.dados.lotes.some((lote: { id: string }) => lote.id === loteId));
    const relatorioTriagem = await chamar("GET", `/lotes/${loteId}/relatorio-triagem`, tokens.AUDITOR);
    assert.equal(relatorioTriagem.status, 200);
    assert.equal(relatorioTriagem.dados.quantidadeEquipamentos, 2);
    const relatorioFinanceiro = await chamar("GET", `/relatorios/financeiro?dataInicio=${encodeURIComponent(inicio)}&dataFim=${encodeURIComponent(fim)}`, tokens.AUDITOR);
    assert.equal(relatorioFinanceiro.status, 200);
    assert.ok(relatorioFinanceiro.dados.contratos.some((contrato: { organizacaoId: string }) => contrato.organizacaoId === orgId));
    assert.equal((await chamar("GET", "/relatorios/status?status=BAIXA_DEFINITIVA", tokens.AUDITOR)).status, 200);

    // Inativação e reativação em cadeia do lote e da organização.
    const loteParaInativar = (await chamar("GET", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO)).dados;
    const loteInativado = await chamar("DELETE", `/lotes/${loteId}?versao=${loteParaInativar.versao}`, tokens.GESTOR_ALMOXARIFADO);
    assert.equal(loteInativado.status, 200);
    assert.equal((await chamar("PATCH", `/lotes/${loteId}/ativar`, tokens.GESTOR_ALMOXARIFADO, { versao: loteInativado.dados.versao })).status, 200);

    const orgAntesDeInativar = (await chamar("GET", `/organizacoes/${orgId}`, tokens.OPERADOR_CADASTRO)).dados;
    const orgInativada = await chamar("DELETE", `/organizacoes/${orgId}?versao=${orgAntesDeInativar.versao}`, tokens.OPERADOR_CADASTRO);
    assert.equal(orgInativada.status, 200);
    assert.equal((await chamar("GET", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO)).status, 404);
    assert.equal((await chamar("PATCH", `/organizacoes/${orgId}/ativar`, tokens.OPERADOR_CADASTRO, { versao: orgInativada.dados.versao })).status, 200);
    assert.equal((await chamar("GET", `/lotes/${loteId}`, tokens.GESTOR_ALMOXARIFADO)).status, 200, "reativação da organização deve reativar o lote");

    // Confirma exclusão definitiva de equipamento e contrato.
    const equipamentoParaExcluir = await chamar("GET", `/equipamentos/${equipamento2Id}`, tokens.AUDITOR);
    assert.equal((await chamar("DELETE", `/equipamentos/${equipamento2Id}?versao=${equipamentoParaExcluir.dados.versao}`, tokens.GESTOR_ALMOXARIFADO)).status, 204);
    assert.equal((await chamar("GET", `/equipamentos/${equipamento2Id}`, tokens.AUDITOR)).status, 404);
    assert.equal((await chamar("DELETE", `/contratos/${contratoCriado.dados.id}?versao=${contratoAtualizado.dados.versao}`, tokens.OPERADOR_CADASTRO)).status, 200);

    // Confirma a regra do administrador inicial: protege-se o último ativo, não o primeiro criado.
    const segundoAdminNome = `${prefixoUsuario}-ADMIN-2`;
    dadosUsuarios.push(segundoAdminNome);
    const segundoAdmin = await chamar("POST", "/usuarios", tokenAdmin, { usuario: segundoAdminNome, senha: "Senha-teste-123", papel: "ADMINISTRADOR" });
    assert.equal(segundoAdmin.status, 201);
    const segundoLogin = await chamar("POST", "/auth/login", undefined, { usuario: segundoAdminNome, senha: "Senha-teste-123" });
    const tokenSegundoAdmin = segundoLogin.dados.token as string;
    assert.equal((await chamar("DELETE", `/usuarios/${adminId}`, tokenSegundoAdmin)).status, 200);
    assert.equal((await chamar("DELETE", `/usuarios/${segundoAdmin.dados.id}`, tokenSegundoAdmin)).status, 409, "não pode inativar o último administrador ativo");
    assert.equal((await chamar("PATCH", `/usuarios/${adminId}/ativar`, tokenSegundoAdmin)).status, 200);
});

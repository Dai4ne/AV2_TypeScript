# GreenCode — AV2

Continuação do GreenCode da AV1. Esta etapa migra a aplicação de terminal para um servidor monolítico com API REST, Fastify, Prisma e PostgreSQL.

## Base preparada

- Fastify em TypeScript.
- Rota GET /health que consulta o banco.
- Documentação inicial em /docs.
- Plugin JWT registrado para as próximas rotas autenticadas.
- Schema Prisma com usuário, organização, contrato, lote, equipamento e movimentação.
- Pastas iniciais para controllers, serviços, repositórios, plugins e testes.

## Requisitos

- Node.js 20.19 ou superior.
- PostgreSQL instalado e iniciado.
- npm.

## Preparar o ambiente

1. Instale os pacotes: npm install
2. Copie .env.example para .env.
3. Ajuste DATABASE_URL com usuário, senha e banco do PostgreSQL local.
4. Troque JWT_SECRET por uma chave longa própria.
5. Crie no PostgreSQL o banco greencode (ou use o nome na URL).
6. Gere o Prisma Client e valide o schema:

       npm run db:generate
       npm run db:validate

7. Crie as tabelas da primeira migração:

       npm run db:migrate -- --name inicial

## Executar

       npm run dev

Acesse http://127.0.0.1:3000/health para verificar API e banco. Consulte http://127.0.0.1:3000/docs para a documentação disponível.

## Scripts

- npm run dev: inicia o servidor em modo de desenvolvimento.
- npm run build: gera o Prisma Client e compila TypeScript em dist.
- npm start: inicia a versão compilada.
- npm run db:generate: gera os tipos e métodos do Prisma Client.
- npm run db:validate: verifica o schema Prisma.
- npm run db:format: organiza o schema Prisma.
- npm run db:migrate -- --name nome: cria ou aplica uma migração local.
- npm run db:studio: abre uma interface visual para o banco.

## Próximas etapas

1. Implementar login e emissão/verificação de JWT.
2. Criar repositórios e serviços para os modelos.
3. Criar controllers e rotas REST com validação.
4. Usar transações nas operações relacionadas.
5. Preparar seed e migração dos dados da AV1.
6. Adicionar testes para regras, permissões, rotas e transações.
7. Completar a documentação e verificar Windows e Ubuntu.

A pasta data da AV1 não é migrada automaticamente. A transferência dos registros será planejada separadamente para preservar seus dados e relações.
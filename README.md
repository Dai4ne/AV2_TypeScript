# GreenCode — AV2

API REST da continuação do GreenCode da AV1, feita com TypeScript, Fastify, Prisma e PostgreSQL.

## Preparar pela primeira vez

1. Instale as dependências:

       npm install

2. Copie `.env.example` para `.env`.
3. No `.env`, informe a conexão do PostgreSQL em `DATABASE_URL` e escolha uma chave longa para `JWT_SECRET`.
4. Defina `ADMIN_USER` e `ADMIN_PASSWORD`. Eles serão usados para criar o primeiro administrador; troque os valores de exemplo.
5. Crie o banco `greencode` no PostgreSQL, se ainda não existir.
6. Crie/aplique as tabelas e gere o Prisma Client:

       npm run db:migrate -- --name inicial

   O comando de migração também gera o Prisma Client. Se você alterar `prisma/schema.prisma` depois, rode `npm run db:generate`.

7. Crie o administrador inicial:

       npm run db:seed

O seed não imprime nem salva a senha em texto puro. A senha é protegida com hash e salt, seguindo o formato da AV1.

## Iniciar e testar pela documentação

Inicie o servidor:

       npm run dev

Abra <http://localhost:3000/docs>. Faça `POST /auth/login` com `ADMIN_USER` e `ADMIN_PASSWORD`. Copie o token retornado, clique em **Authorize** e cole somente o token. A API o envia como `Bearer` nas próximas requisições. O token expira em 30 minutos.

`GET /health` verifica a conexão com o banco. O Swagger lista as demais rotas e os campos aceitos.

## Operações disponíveis

- **Usuários:** cadastrar, consultar, listar todos os ativos ou filtrar por papel (`GET /usuarios/papel/{papel}`), alterar nome/papel, inativar e reativar. A própria pessoa pode trocar a senha; administrador pode redefinir senhas e gerenciar contas.
- **Organizações:** cadastrar, consultar, listar, atualizar CNPJ e dados, inativar e reativar. E-mails são normalizados e não podem ser repetidos. A inativação também inativa lotes e equipamentos vinculados.
- **Contratos:** cadastrar, consultar, listar, atualizar e excluir definitivamente. Cada organização pode ter no máximo um contrato.
- **Lotes:** cadastrar, consultar com equipamentos, listar, atualizar, inativar e alterar manualmente o status. Só é permitido cadastrar lote para organização ativa com contrato vigente. Inativar lote também inativa os equipamentos.
- **Equipamentos:** cadastrar, consultar, listar, atualizar, alterar status e excluir definitivamente. O ID do equipamento também é seu código de barras. A exclusão definitiva remove suas movimentações vinculadas.
- **Movimentações:** registrar e consultar no histórico do equipamento. O histórico é somente de acréscimo para preservar os registros.

As movimentações mantêm o instante correto no banco e as respostas também incluem `dataHoraBrasilia`, formatada para o fuso `America/Sao_Paulo`.

O papel `ADMINISTRADOR` tem acesso a todas as rotas. Os outros papéis seguem as permissões da AV1: operador de cadastro gerencia organizações/contratos; gestor de almoxarifado gerencia lotes/equipamentos; auditor consulta rastreamento e movimentações.

## Regra de status do lote definida para a AV2

O responsável altera manualmente os status `RECEBIDO`, `EM_TRIAGEM`, `ENCAMINHADO` e `FINALIZADO`. `TRIAGEM_CONCLUIDA` é atribuído automaticamente quando todos os equipamentos ativos do lote chegam a `BAIXA_DEFINITIVA`.

## Comandos úteis

- `npm run build`: compila o TypeScript para a pasta `dist`.
- `npm run db:generate`: gera novamente o Prisma Client depois de mudanças no schema.
- `npm run db:validate`: valida o schema Prisma.
- `npm run db:format`: formata o schema Prisma.
- `npm run db:studio`: abre a interface visual das tabelas.
- `npm run db:seed`: cria o primeiro administrador, se ainda não houver um ativo.

## Observações

Os dados existentes na pasta `data` da AV1 não são importados automaticamente para o PostgreSQL. Essa migração precisa ser planejada para preservar IDs e relações.

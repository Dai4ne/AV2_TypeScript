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

7. Crie o administrador inicial e os dados demonstrativos:

       npm run db:seed

O seed não importa dados da AV1. Ele cria o administrador com a senha protegida por hash e salt e inclui organizações, contratos, lotes, equipamentos e movimentações fictícios, cobrindo status e contrato expirado. Os IDs de demonstração começam com `DEMO-`.

## Testar com `tests/requests.http`

O seed e o roteiro HTTP têm funções diferentes: o seed prepara o administrador e os exemplos `DEMO-`; o arquivo `tests/requests.http` envia chamadas à API e mostra as respostas. Os cadastros feitos pelo roteiro usam IDs `HTTP-` e nomes `http_`, então não substituem nem se confundem com os registros `DEMO-`.

Antes de enviar as requisições, rode o seed e inicie a API. Abra `tests/requests.http` no VS Code com a extensão REST Client e confira no início do arquivo se `@admin` e `@senhaAdmin` correspondem às credenciais `ADMIN_USER` e `ADMIN_PASSWORD` do `.env`. Envie os pedidos na ordem indicada. Um dos cenários de erro usa `DEMO-ORG-CONTRATO-EXPIRADO`, por isso depende dos dados de exemplo do seed.

Os registros `HTTP-` permanecem no banco depois dos testes; rodar o seed novamente não os apaga. Se quiser repetir o roteiro desde o começo com os mesmos IDs, pare o servidor e execute `npx prisma migrate reset`, confirme a operação e rode `npm run db:seed` novamente. **O reset apaga todos os dados do banco apontado por `DATABASE_URL`**, então confira no `.env` que está selecionado o banco local de desenvolvimento. Como alternativa, troque os IDs e nomes de usuário de demonstração no arquivo antes de repetir.

## Iniciar e testar pela documentação

Inicie o servidor:

       npm run dev

Abra <http://localhost:3000/docs>. Faça `POST /auth/login` com `ADMIN_USER` e `ADMIN_PASSWORD`. Copie o token retornado, clique em **Authorize** e cole somente o token. A API o envia como `Bearer` nas próximas requisições. O token expira em 30 minutos.

`GET /health` verifica a conexão com o banco. O Swagger lista as demais rotas e os campos aceitos.

## Operações disponíveis

- **Usuários:** cadastrar, consultar, listar todos os ativos ou filtrar por papel (`GET /usuarios/papel/{papel}`), alterar nome/papel, inativar e reativar. A própria pessoa pode trocar a senha; administrador pode redefinir senhas e gerenciar contas.
- **Organizações:** cadastrar, consultar, listar, atualizar CNPJ e dados, inativar e reativar. E-mails são normalizados e não podem ser repetidos. Inativar ou reativar uma organização também inativa ou reativa seus lotes e equipamentos vinculados.
- **Contratos:** cadastrar, consultar, listar, atualizar e excluir definitivamente. Cada organização pode ter no máximo um contrato.
- **Lotes:** cadastrar, consultar com equipamentos, listar, atualizar, inativar, reativar e alterar manualmente o status. Só é permitido cadastrar lote para organização ativa com contrato vigente. Inativar ou reativar lote também inativa ou reativa seus equipamentos; para reativar o lote, a organização precisa estar ativa.
- **Equipamentos:** cadastrar, consultar, listar, atualizar, alterar status e excluir definitivamente. O ID do equipamento também é seu código de barras. A exclusão definitiva remove suas movimentações vinculadas. Alterações do estado físico ficam registradas na observação do histórico, incluindo a justificativa quando informada.
- **Movimentações:** registrar e consultar no histórico do equipamento. O histórico é somente de acréscimo para preservar os registros.

## Relatórios

- `GET /relatorios/organizacoes/{organizacaoId}?dataInicio=...&dataFim=...`: quantidade e lista de lotes da organização no período.
- `GET /relatorios/status?status=...`: quantidade de equipamentos ativos em um status de rastreamento.
- `GET /relatorios/financeiro?dataInicio=...&dataFim=...`: contratos vigentes que se sobrepõem ao período e soma de seus valores mensais.
- `GET /lotes/periodo?dataInicio=...&dataFim=...`: lotes ativos recebidos no período.
- `GET /lotes/{id}/relatorio-triagem`: quantidade de equipamentos ativos, peso total e distribuição por status.

As consultas de relatório aceitam os papéis de operador de cadastro, gestor de almoxarifado e auditor; o administrador também tem acesso.

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
- `npm run db:seed`: cria o administrador inicial, se necessário, e insere ou atualiza os dados de exemplo `DEMO-`.

## Evitar alterações simultâneas com dados desatualizados

Organizações, contratos, lotes e equipamentos têm o campo `versao`, iniciado em `1`. As consultas devolvem esse número. Ao atualizar, alterar status, inativar, reativar ou excluir, envie a versão que recebeu na consulta ou na resposta da operação anterior. Ao cadastrar equipamento, envie `versaoLote` com a versão atual do lote. Se outra requisição já alterou o registro, a API responde `409 Conflict`; consulte o registro de novo e reaplique a mudança sobre os dados atuais.

- `PUT` e alterações de status/reativação recebem `versao` no JSON.
- `DELETE` recebe `?versao=NUMERO` na URL.
- `POST /equipamentos` recebe `versaoLote` junto com o `loteId`.
- Inativação/reativação em cadeia também aumenta a versão dos lotes/equipamentos afetados.

Exemplo: se `GET /lotes/LOTE-01` retorna `"versao": 3`, envie `"versao": 3` no JSON do `PUT /lotes/LOTE-01`. Se outra alteração já ocorreu, o retorno `409` indica que é preciso consultar o lote novamente.

## Observações

Os dados da AV1 não são importados. A AV2 começa com dados fictícios criados pelo seed.

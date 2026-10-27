# <div align='center'> 🌿GreenCode — AV2 </div>

API REST da continuação do GreenCode da <a href='https://github.com/Dai4ne/AV1_TypeScript'> AV1</a>, feita com TypeScript, Fastify, Prisma e PostgreSQL.

O sistema controla logística reversa de eletrônicos: usuários com papéis, organizações, contratos, lotes, equipamentos, movimentações e relatórios. A documentação interativa fica em `/docs` (Swagger UI). O roteiro de requisições manuais está em `tests/requests.http`.

Os dados da AV1 **não** são importados. A AV2 começa com registros fictícios criados pelo seed (`DEMO-`).

## 📃Sumário

1. [Ferramentas necessárias](#ferramentas-necessárias)
2. [Instalar as ferramentas](#instalar-as-ferramentas)
3. [Preparar o PostgreSQL](#preparar-o-postgresql)
4. [Configurar e subir o projeto](#configurar-e-subir-o-projeto)
5. [Rodar no Linux](#rodar-no-linux)
6. [Usar o Swagger](#usar-o-swagger)
7. [Usar o `tests/requests.http`](#usar-o-testsrequestshttp)
8. [Operações disponíveis](#operações-disponíveis)
9. [Relatórios](#relatórios)
10. [Controle de concorrência (`versao`)](#controle-de-concorrência-versao)
11. [Comandos úteis](#comandos-úteis)
12. [Problemas comuns](#problemas-comuns)

## 🔧Ferramentas necessárias

| Ferramenta | Versão mínima | Para que serve |
| --- | --- | --- |
| [Git](https://git-scm.com/) | qualquer recente | clonar o repositório |
| [Node.js](https://nodejs.org/) | **18.18 ou superior** (recomendado **20 LTS** ou **22 LTS**) | executar a API |
| npm | vem com o Node.js | instalar dependências e rodar scripts |
| [PostgreSQL](https://www.postgresql.org/download/) | **14 ou superior** | banco de dados |
| Editor (VS Code, Cursor ou similar) | — | editar código e enviar o roteiro HTTP |
| Extensão [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) (`humao.rest-client`) | — | executar `tests/requests.http` |

Navegador qualquer (Chrome, Firefox, Edge) para abrir o Swagger em `http://localhost:3000/docs`.

Não é obrigatório Docker. Prisma Studio (`npm run db:studio`) é opcional e abre uma tela das tabelas.

<Br>

## 🔧Instalar as ferramentas

### 🪟Windows

1. Instale o [Node.js LTS](https://nodejs.org/). No instalador, deixe marcada a opção de adicionar ao `PATH`.
2. Instale o [PostgreSQL](https://www.postgresql.org/download/windows/). Anote a senha do usuário `postgres` e a porta (padrão `5432`).
3. Instale o [Git](https://git-scm.com/download/win) se ainda não tiver.
4. Confira no PowerShell ou no Prompt:

       node -v
       npm -v
       psql --version
       git --version

   Se `psql` não for encontrado, use o **SQL Shell (psql)** do menu Iniciar ou adicione a pasta `bin` do PostgreSQL ao `PATH` (exemplo: `C:\Program Files\PostgreSQL\16\bin`).

### 🐧Linux (Ubuntu/Debian)

       sudo apt update
       sudo apt install -y git curl ca-certificates
       curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
       sudo apt install -y nodejs postgresql postgresql-contrib
       sudo systemctl enable --now postgresql
       node -v
       npm -v
       psql --version

Em outras distribuições, instale Node.js 18.18+ e PostgreSQL 14+ pelos gerenciadores da distro. No Linux, o motor do Prisma também precisa das bibliotecas OpenSSL do sistema (em Ubuntu costumam vir com `ca-certificates` / `libssl`).

<br>

## 🐘Preparar o PostgreSQL

1. Inicie o serviço, se ainda não estiver em execução.

   - Windows: serviços do Windows → **postgresql**, ou reinicie o computador após a instalação.
   - Linux:

         sudo systemctl start postgresql

2. Abra o `psql` como superusuário.

   - Windows (SQL Shell): aceite host `localhost`, porta `5432`, usuário `postgres` e informe a senha definida na instalação.
   - Linux:

         sudo -u postgres psql

3. Crie o banco e, se quiser, um usuário só para o projeto (troque `senha_local`):

       CREATE DATABASE greencode;
       CREATE USER greencode WITH PASSWORD 'senha_local';
       GRANT ALL PRIVILEGES ON DATABASE greencode TO greencode;

   No PostgreSQL 15+, também conceda permissão no schema `public` depois de conectar no banco:

       \c greencode
       GRANT ALL ON SCHEMA public TO greencode;
       ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO greencode;
       ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO greencode;

   Se preferir usar o usuário `postgres` já existente, pule a criação de usuário e aponte `DATABASE_URL` para ele.

4. Saia com `\q`.

Para conferir se o banco existe:

       psql -U postgres -h localhost -c "\l"

<br>

## 🧱Configurar e subir o projeto

Faça estes passos na pasta raiz do repositório (onde está o `package.json`).

1. Instale as dependências:

       npm install

2. Copie o arquivo de exemplo de ambiente:

       cp .env.example .env

   No PowerShell do Windows:

       Copy-Item .env.example .env

3. Edite o `.env`. Os campos são estes:

   | Variável | Obrigatório | Significado |
   | --- | --- | --- |
   | `DATABASE_URL` | sim | conexão Prisma/PostgreSQL |
   | `JWT_SECRET` | sim | chave do token; **mínimo 32 caracteres** |
   | `HOST` | não (padrão `127.0.0.1`) | endereço em que a API escuta |
   | `PORT` | não (padrão `3000`) | porta da API |
   | `ADMIN_USER` | sim para o seed | login do primeiro administrador |
   | `ADMIN_PASSWORD` | sim para o seed | senha do primeiro administrador |

   Exemplo (troque senha, chave JWT e senha do admin):

       DATABASE_URL="postgresql://postgres:senha_local@localhost:5432/greencode?schema=public"
       JWT_SECRET="troque-esta-chave-por-uma-chave-local-com-mais-de-32-caracteres"
       HOST="127.0.0.1"
       PORT="3000"
       ADMIN_USER=admin
       ADMIN_PASSWORD=troque-por-uma-senha-segura

   Formato de `DATABASE_URL`: `postgresql://USUARIO:SENHA@HOST:PORTA/BANCO?schema=public`.

   Se a senha do PostgreSQL tiver caracteres especiais (`@`, `#`, `%`, `/`), codifique-os na URL (por exemplo `@` vira `%40`).

   `ADMIN_USER` e `ADMIN_PASSWORD` são usados **somente no seed** para criar o primeiro administrador. A senha fica no banco com hash e salt. Troque os valores de exemplo. Se já existir um administrador ativo, o seed **não** recria nem altera a senha.

4. Aplique as migrações que já vêm no repositório e gere o Prisma Client:

       npx prisma migrate deploy
       npm run db:generate

   Em desenvolvimento, `npm run db:migrate` também aplica migrações pendentes e gera o client. Use esse comando se você **alterar** `prisma/schema.prisma` e precisar criar uma migração nova (o Prisma pede um nome). **Não** rode `npm run db:migrate -- --name inicial` de novo neste repositório: a migração inicial já existe em `prisma/migrations`.

5. Crie o administrador inicial e os dados demonstrativos:

       npm run db:seed

   O seed cria o administrador (se ainda não houver um ativo) e inclui organizações, contratos, lotes, equipamentos e movimentações fictícios, cobrindo status e contrato expirado. Os IDs de demonstração começam com `DEMO-`. Executar o seed de novo atualiza esses `DEMO-` e não apaga cadastros feitos depois (por exemplo os `HTTP-` do roteiro).

6. Inicie a API em modo desenvolvimento (recarrega ao salvar arquivos):

       npm run dev

   A API fica em `http://127.0.0.1:3000` (ou no `HOST`/`PORT` do `.env`). Encerre com `Ctrl+C`.

7. Confira a saúde (não exige login):

       curl http://127.0.0.1:3000/health

   Resposta esperada: `{"status":"ok","banco":"conectado"}` (campos equivalentes). Se o PostgreSQL estiver parado, a rota responde erro interno.

Para produção local, depois do `npm run dev` funcionar:

       npm run build
       npm start

`npm start` executa o JavaScript gerado em `dist/` e **não** recarrega sozinho ao editar o código.

<br>

## 🐧Rodar no Linux

Os passos são os mesmos da seção anterior. Pontos específicos:

- Use `cp .env.example .env` e um editor (`nano .env`, `vim .env` ou o VS Code).
- Garanta que o PostgreSQL aceite conexão em `localhost:5432`. Se `DATABASE_URL` usar o usuário `postgres` e a autenticação for `peer` (comum no Ubuntu), crie um usuário com senha como na seção do banco, ou ajuste `pg_hba.conf` para `md5`/`scram-sha-256` em conexões TCP. A forma mais simples para desenvolvimento é um usuário com senha e `DATABASE_URL` apontando para `localhost`.
- Mantenha `HOST=127.0.0.1` para aceitar só a máquina local. Use `HOST=0.0.0.0` somente se precisar acessar a API de outro computador na rede.
- Caminhos e maiúsculas/minúsculas importam (`tests/requests.http`, não `Tests/Requests.HTTP`).
- Se o Prisma falhar ao baixar o motor nativo, instale as libs SSL da distro e rode de novo `npm install` / `npx prisma generate`.

<br>

## 📗Usar o Swagger

Com a API no ar (`npm run dev`):

1. Abra [http://localhost:3000/docs](http://localhost:3000/docs) no navegador. Essa é a interface Swagger UI.
2. A especificação OpenAPI também fica em [http://localhost:3000/docs/json](http://localhost:3000/docs/json) (JSON) e [http://localhost:3000/docs/yaml](http://localhost:3000/docs/yaml) (YAML).
3. `GET /health` e `POST /auth/login` são públicos. Todas as outras rotas exigem JWT.
4. Faça login:
   - Expanda **autenticação** → `POST /auth/login` → **Try it out**.
   - Corpo de exemplo (use `ADMIN_USER` e `ADMIN_PASSWORD` do `.env`):

         {
           "usuario": "admin",
           "senha": "troque-por-uma-senha-segura"
         }

   - Clique em **Execute**.
   - Na resposta `200`, copie só o valor de `token` (sem a palavra `Bearer`).
5. Autorize as demais chamadas:
   - Clique em **Authorize** (cadeado no topo).
   - Cole **somente o token**.
   - Confirme. A UI envia `Authorization: Bearer <token>` nas rotas protegidas.
6. Escolha a rota, **Try it out**, preencha JSON/parâmetros e **Execute**. O painel mostra status, corpo e o `curl` equivalente.
7. O token vale **30 minutos**. Se as rotas voltarem `401`, faça login de novo e atualize o Authorize.

No Swagger, ao atualizar, alterar status, inativar, reativar ou excluir, envie a `versao` atual (veja [Controle de concorrência](#controle-de-concorrência-versao)). No cadastro de equipamento, envie `versaoLote`.
Para testar outro papel, faça login com essa conta (depois de criá-la como administrador) e substitua o token no Authorize.

<br>

## 👨‍💻Papéis
- O `ADMINISTRADOR` acessa todas as rotas protegidas.
- O `OPERADOR` de cadastro gerencia organizações e contratos.
- O `GESTOR` de almoxarifado gerencia lotes e equipamentos.
- O `AUDITOR` consulta rastreamento, movimentações e relatórios. 

Os `RELATÓRIOS` também aceitam operador, gestor, auditor e administrador.

<br>

## 📋Usar o `tests/requests.http`

O seed e o roteiro HTTP têm funções diferentes: o seed prepara o administrador e os exemplos `DEMO-`; o arquivo `tests/requests.http` envia chamadas à API. Os cadastros do roteiro usam IDs `HTTP-` e nomes `http_`, então não substituem nem se confundem com os `DEMO-`.

### Extensão e variáveis

1. No VS Code ou no Cursor, instale a extensão **REST Client** (`humao.rest-client`).
2. Rode o seed e deixe a API no ar (`npm run db:seed` se ainda não rodou, depois `npm run dev`).
3. Abra `tests/requests.http`.
4. No início do arquivo, alinhe as variáveis com o seu ambiente:

       @url = http://localhost:3000
       @admin = admin
       @senhaAdmin = troque_por_sua_senha

   `@admin` e `@senhaAdmin` precisam ser iguais a `ADMIN_USER` e `ADMIN_PASSWORD` do `.env`. Se a porta no `.env` não for `3000`, ajuste `@url`.
5. Cada bloco começa com `###`. Clique em **Send Request** acima do bloco.
6. Envie **na ordem**. Vários pedidos reutilizam o token e IDs de respostas anteriores (`# @name loginAdmin`, `{{loginAdmin.response.body.$.token}}`, `{{criarOrg.response.body.$.versao}}`, etc.). Pular um sucesso quebra os seguintes.
7. Os títulos indicam o status esperado (`sucesso 200`, `erro 401`, `erro 409`, …). Um dos erros de lote usa `DEMO-ORG-CONTRATO-EXPIRADO` e por isso depende do seed.

Login **NÃO** cria uma sessão global: cada pedido usa o `Authorization` escrito nele. Depois de `loginAdmin`, `loginOperador`, `loginGestor` e `loginAuditor`, os blocos seguintes já apontam para o token certo.

Um pedido de `GET /health` está marcado para erro `500`: ele só falha se o PostgreSQL estiver parado. Não pare o banco no meio do roteiro; use esse caso à parte, se quiser demonstrar a falha, e religue o PostgreSQL em seguida.

### Repetir o roteiro

Os registros `HTTP-` permanecem no banco. Rodar o seed de novo **não** os apaga. Para recomeçar com os mesmos IDs:

1. Pare o servidor (`Ctrl+C`).
2. Confira no `.env` que `DATABASE_URL` aponta para o banco **local** de desenvolvimento.
3. Execute:

       npx prisma migrate reset

4. Confirme. **O reset apaga todos os dados desse banco**, reaplica as migrações e, se o Prisma estiver configurado para seed no `package.json`, pode tentar o seed; neste projeto o seed é o script `npm run db:seed`, então rode-o de novo depois:

       npm run db:seed

5. Suba a API e envie o `requests.http` do começo.

Como alternativa, altere os IDs (`HTTP-ORG-001`, …) e os nomes de usuário (`http_operador_001`, …) no arquivo antes de repetir, para não colidir com o que já existe.

<br>

## 📖Operações disponíveis

- **Usuários:** cadastrar, consultar, listar todos os ativos ou filtrar por papel (`GET /usuarios/papel/{papel}`), alterar nome/papel, inativar e reativar. A própria pessoa pode trocar a senha (envie `senhaAtual` e `senha`); administrador pode redefinir senhas (envie só `senha`) e gerenciar contas. Não é permitido rebaixar ou inativar o último administrador ativo. Senhas e hashes nunca voltam nas respostas.
- **Organizações:** cadastrar, consultar, listar, atualizar CNPJ e dados, inativar e reativar. E-mails são normalizados (minúsculas) e não podem ser repetidos. Inativar ou reativar uma organização também inativa ou reativa seus lotes e equipamentos vinculados.
- **Contratos:** cadastrar, consultar, listar, atualizar e excluir definitivamente. Cada organização pode ter no máximo um contrato. A organização precisa estar ativa para cadastrar contrato.
- **Lotes:** cadastrar, consultar com equipamentos, listar, atualizar, inativar, reativar e alterar manualmente o status. Só é permitido cadastrar lote para organização ativa com contrato vigente. Inativar ou reativar lote também inativa ou reativa seus equipamentos; para reativar o lote, a organização precisa estar ativa.
- **Equipamentos:** cadastrar, consultar, listar, atualizar, alterar status e excluir definitivamente. O ID do equipamento também é seu código de barras. A exclusão definitiva remove as movimentações vinculadas. Alterações do estado físico ficam na observação do histórico, incluindo a justificativa quando informada. Piora de duas ou mais categorias no estado físico exige `justificativa`.
- **Movimentações:** registrar e consultar no histórico do equipamento. O histórico é somente de acréscimo. As respostas incluem `dataHora` (instante no banco, com fuso) e `dataHoraBrasilia` (`America/Sao_Paulo`).

### Status do lote (AV2)

O responsável altera manualmente `RECEBIDO`, `EM_TRIAGEM`, `ENCAMINHADO` e `FINALIZADO`. `TRIAGEM_CONCLUIDA` é atribuído automaticamente quando todos os equipamentos ativos do lote chegam a `BAIXA_DEFINITIVA`. Não é permitido definir `TRIAGEM_CONCLUIDA` na mão, nem alterar manualmente um lote já concluído dessa forma.

<br>

## 📝Relatórios

Acesso: operador de cadastro, gestor de almoxarifado, auditor e administrador.

- `GET /relatorios/organizacoes/{organizacaoId}?dataInicio=...&dataFim=...`: quantidade e lista de lotes da organização no período.
- `GET /relatorios/status?status=...`: quantidade de equipamentos ativos em um status de rastreamento.
- `GET /relatorios/financeiro?dataInicio=...&dataFim=...`: contratos vigentes que se sobrepõem ao período e soma de seus valores mensais.
- `GET /lotes/periodo?dataInicio=...&dataFim=...`: lotes ativos recebidos no período.
- `GET /lotes/{id}/relatorio-triagem`: quantidade de equipamentos ativos, peso total e distribuição por status.

Datas no formato ISO-8601, por exemplo `2026-01-01T00:00:00.000Z`. Período invertido (`dataInicio` depois de `dataFim`) retorna `400`.

<br>

## 🎚️Controle de concorrência (`versao`)

Organizações, contratos, lotes e equipamentos têm o campo `versao`, iniciado em `1`. As consultas devolvem esse número. Ao atualizar, alterar status, inativar, reativar ou excluir, envie a versão recebida na consulta ou na resposta da operação anterior. Ao cadastrar equipamento, envie `versaoLote` com a versão atual do lote. Se outra requisição já alterou o registro, a API responde `409 Conflict`; consulte de novo e reaplique a mudança.

- `PUT` e alterações de status/reativação recebem `versao` no JSON.
- `DELETE` recebe `?versao=NUMERO` na URL.
- `POST /equipamentos` recebe `versaoLote` junto com o `loteId`.
- Inativação/reativação em cadeia também aumenta a versão dos lotes/equipamentos afetados.

Exemplo: se `GET /lotes/LOTE-01` retorna `"versao": 3`, envie `"versao": 3` no JSON do `PUT /lotes/LOTE-01`.

<br>

## 💻Comandos úteis

| Comando | Função |
| --- | --- |
| `npm install` | instala dependências |
| `npm run dev` | sobe a API com recarga (`tsx watch`) |
| `npm run build` | compila TypeScript para `dist/` |
| `npm start` | executa `dist/server.js` |
| `npx prisma migrate deploy` | aplica migrações já existentes no repositório |
| `npm run db:migrate` | migrações em desenvolvimento (pode criar uma nova) |
| `npm run db:generate` | gera o Prisma Client depois de mudar o schema |
| `npm run db:validate` | valida `prisma/schema.prisma` |
| `npm run db:format` | formata o schema Prisma |
| `npm run db:studio` | interface visual das tabelas (em geral `http://localhost:5555`) |
| `npm run db:seed` | administrador inicial (se faltar) e dados `DEMO-` |
| `npx prisma migrate reset` | **apaga** o banco apontado por `DATABASE_URL`, reaplica migrações |

<br>

## 🚨Problemas comuns

| Sintoma | O que conferir |
| --- | --- |
| `JWT_SECRET` / “pelo menos 32 caracteres” | o `.env` existe na raiz, a chave tem 32+ caracteres, e você reiniciou `npm run dev` depois de editar |
| Falha de conexão Prisma / `P1000` / `P1001` | PostgreSQL no ar, `DATABASE_URL` com usuário/senha/porta/banco certos, banco `greencode` criado |
| `P2021` (tabela não existe) | rode `npx prisma migrate deploy` |
| Seed pede `ADMIN_USER` / `ADMIN_PASSWORD` | as duas variáveis estão no `.env` |
| Login `401` no Swagger ou no HTTP | usuário/senha iguais aos do seed; se o admin já existia, o seed não muda a senha |
| `401` depois de meia hora | token expirado; faça login de novo |
| `403` | papel sem permissão naquela rota |
| `409` em atualização | versão desatualizada; faça GET e envie a `versao` nova |
| Roteiro HTTP quebra no meio | pedidos fora de ordem, ou IDs `HTTP-` já existentes; reset + seed, ou troque os IDs |
| Porta 3000 em uso | mude `PORT` no `.env` e o `@url` do `requests.http` |
| Swagger abre mas as rotas protegidas falham | Authorize com o token puro, sem prefixo `Bearer ` |

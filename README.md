# Go Gym Track

Aplicação de acompanhamento de treinos com API Go/Gin, PostgreSQL e frontend
React/Vite. Os dados são isolados por usuário e a autenticação usa JWT de curta
duração com refresh token rotativo em cookie `HttpOnly`.

## Estrutura

```text
cmd/api/          servidor HTTP
cmd/migrate/      executor de migrations
internal/         domínio, autenticação, handlers e repositories
migrations/       schema PostgreSQL versionado
frontend/         aplicação React
```

O contrato detalhado da API e as decisões de arquitetura estão em
[`frontend/.agents/api-auth-plan.md`](frontend/.agents/api-auth-plan.md).

## Pré-requisitos

- Go compatível com a versão declarada em `go.mod`;
- PostgreSQL;
- Node.js e npm para o frontend.

## Configurar a API no PowerShell

O Go lê variáveis do processo; o arquivo `.env` não é carregado automaticamente.
Para uma sessão local de desenvolvimento, defina pelo menos:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
$env:JWT_SIGNING_KEY = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

As outras opções e seus valores de desenvolvimento estão em `.env.example`.
As variáveis definidas com `$env:` duram apenas no processo atual do PowerShell e
nos processos iniciados por ele.

### Criar ou atualizar o banco

```powershell
go run ./cmd/migrate
```

Antes de executar em um banco que já contém a versão antiga, faça backup. A
primeira migration preserva o schema anterior renomeando as tabelas para
`legacy_muscles`, `legacy_workouts` e `legacy_workout_sets`; ela não importa esses
registros para usuários novos.

No Supabase, a migration seguinte habilita RLS e remove o acesso dos papéis da
Data API (`anon`, `authenticated` e `service_role`) das tabelas do GymTrack. A
aplicação deve usar a connection string PostgreSQL do papel `postgres`; ela não
consulta essas tabelas por `supabase-js`, REST ou GraphQL.

Também é possível iniciar a API com `RUN_MIGRATIONS=true`, mas o comando dedicado
é preferível por deixar a alteração do schema explícita.

### Iniciar a API

```powershell
go run ./cmd/api
```

Por padrão, a API escuta em `http://localhost:8080`. Os probes públicos são
`GET /healthz` e `GET /readyz`; o contrato de negócio fica sob `/api/v1`.

## Iniciar o frontend

Em outro PowerShell:

```powershell
cd frontend
npm install
npm run dev
```

O Vite encaminha `/api` para `http://localhost:8080`. Para apontar para outro
servidor, defina `VITE_API_URL`; essa variável deve conter apenas URL pública,
nunca segredos.

## Autenticação

- O access token JWT dura 15 minutos por padrão e existe somente em memória no
  frontend.
- O refresh token dura 30 dias, é salvo como hash no banco e rotacionado a cada
  uso.
- O navegador recebe o refresh em cookie `HttpOnly`, `SameSite=Lax` e `Secure`
  obrigatório quando `APP_ENV=production`.
- O frontend não usa `localStorage` nem `sessionStorage` para tokens ou treinos.

Em produção, configure explicitamente `CORS_ALLOWED_ORIGINS`, use HTTPS e defina
`COOKIE_SECURE=true`.

## Deploy

### API no Render

O [`Dockerfile`](Dockerfile) gera um binário Go estático e o executa em uma
imagem distroless como usuário não-root. A API usa automaticamente o `PORT`
fornecido pelo Render e escuta em `0.0.0.0`.

O [`render.yaml`](render.yaml) permite criar o serviço como Blueprint. Antes do
primeiro deploy, informe no painel:

- `DATABASE_URL`: connection string do Supabase; em redes IPv4, prefira o
  Session pooler na porta `5432` e inclua `sslmode=require`;
- `CORS_ALLOWED_ORIGINS`: URL final do frontend, por exemplo
  `https://go-gym-track.vercel.app`.

`JWT_SIGNING_KEY` é gerado pelo Render. As migrations já aplicadas não são
executadas durante o startup porque `RUN_MIGRATIONS=false`. O health check usa
`GET /healthz`.

O Blueprint está configurado inicialmente para o plano `free` e região
`virginia`. Altere a região antes da primeira criação se outra estiver mais
próxima do projeto Supabase, pois o Render não permite mudá-la depois.

### Frontend na Vercel

Ao importar este monorepo na Vercel:

1. defina **Root Directory** como `frontend`;
2. mantenha [`Dockerfile.vercel`](frontend/Dockerfile.vercel) na raiz desse
   projeto;
3. crie a variável de runtime `API_UPSTREAM` com a origem do Render, sem barra
   final, por exemplo `https://go-gym-track-api.onrender.com`;
4. não configure `VITE_API_URL` com o domínio do Render: mantenha `/api/v1`.

O Nginx serve a SPA e encaminha `/api/*` ao Render. Para o navegador, frontend e
API permanecem na mesma origem; isso permite que o refresh cookie `HttpOnly` e
`SameSite=Lax` funcione sem depender de cookies de terceiros.

Depois que a Vercel gerar a URL definitiva, confirme esse valor em
`CORS_ALLOWED_ORIGINS` no Render e faça um novo deploy da API. URLs variáveis de
preview precisam ser adicionadas explicitamente caso também devam acessar a API.

### Alternativa: API no Fly.io

O [`fly.toml`](fly.toml) usa o mesmo `Dockerfile`, região de São Paulo (`gru`),
porta interna `10000` e health check em `/healthz`. Antes do primeiro deploy,
confirme se o nome global definido em `app` está disponível e altere-o se
necessário.

```powershell
fly auth login
fly launch --no-deploy

fly secrets set DATABASE_URL="postgresql://.../postgres?sslmode=require"
fly secrets set JWT_SIGNING_KEY="SEGREDO_COM_PELO_MENOS_32_CARACTERES"
fly secrets set CORS_ALLOWED_ORIGINS="https://seu-front.vercel.app"

fly deploy
```

Com `min_machines_running = 0`, a máquina pode parar sem tráfego e reiniciar na
próxima requisição. Para evitar cold start, use `1`, considerando o custo de
manter uma máquina ativa.

## Validação

```powershell
go test ./cmd/... ./internal/... ./migrations/...
cd frontend
npm run lint
npm run test
npm run build
```

Os testes Go são limitados aos pacotes do projeto para não atravessar possíveis
pacotes Go dentro de `frontend/node_modules`.

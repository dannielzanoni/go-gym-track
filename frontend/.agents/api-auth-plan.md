# Integração API e autenticação

## Status em 22/08/2026

O contrato deste documento foi implementado no backend e no frontend:

- migrations e domínio multiusuário;
- proteção das tabelas no Supabase com RLS e revogação dos papéis da Data API;
- cadastro, login, refresh rotativo, logout e rota protegida `me`;
- API versionada da ficha e das sessões de treino;
- cliente React com access token em memória e refresh single-flight;
- rotas de autenticação, CRUD/reorder e execução do treino via API;
- remoção do seed e de toda persistência em Web Storage;
- testes unitários de senha, JWT, configuração, middleware, validação de cadastro,
  mapeamento de DTOs e refresh single-flight no cliente HTTP.

Lint, build do frontend e testes Go passam. A migration ainda deve ser validada
em uma instância PostgreSQL isolada antes de ser aplicada ao banco do usuário;
testes de integração com PostgreSQL e E2E continuam sendo a próxima camada de
qualidade recomendada.

## Objetivo

Substituir completamente o estado persistido em `localStorage` por uma API Go
autenticada, com dados isolados por usuário e persistidos no PostgreSQL.

Este documento nasceu como plano e agora também registra o contrato implementado
e as decisões que devem ser preservadas em mudanças futuras.

## Decisões

- A API pública será versionada sob `/api/v1` e usará recursos no plural.
- O conteúdo existente no `localStorage` não será migrado. Após a mudança, o
  banco será a única fonte de verdade.
- O frontend não armazenará access token, refresh token ou credenciais em
  `localStorage` ou `sessionStorage`.
- O access token será um JWT de curta duração mantido apenas em memória.
- O refresh token será opaco, rotativo, armazenado como hash no banco e enviado
  em cookie `HttpOnly`, `Secure` em produção e `SameSite` explícito.
- Dados de configuração e dados executados serão separados: exercício e série
  planejada não são a mesma entidade que uma sessão de treino e uma série
  executada.
- Toda consulta de negócio será filtrada pelo `user_id` obtido do token. IDs
  recebidos na URL ou no corpo nunca definem o proprietário do recurso.
- Finalizar um treino será uma operação transacional e idempotente por estado da
  sessão: uma sessão já concluída não poderá ser concluída novamente.

## Estado anterior ao trabalho

### Frontend

O frontend não utiliza nenhum endpoint hoje. `GymProvider` carrega e salva um
único `GymState` por meio de `src/services/gym-storage.ts` e inicia com os dados
de `src/data/seed.ts`.

Fluxos que precisam passar a usar a API:

1. Carregar músculos, exercícios, séries planejadas, último treino e histórico.
2. Criar, renomear, excluir e reordenar músculos.
3. Criar, renomear, excluir e reordenar exercícios.
4. Criar, editar, excluir e reordenar séries planejadas.
5. Iniciar ou retomar uma sessão de treino.
6. Alterar repetições, carga e conclusão de cada série da sessão.
7. Finalizar uma sessão com no mínimo 10 séries concluídas.
8. Consultar o histórico das séries.

### API Go

| Método | Endpoint atual | Comportamento atual | Limitação |
| --- | --- | --- | --- |
| `GET` | `/muscles` | Lista `id` e `name` | Global, sem exercícios, paginação ou usuário |
| `POST` | `/muscle` | Cria músculo | Sem usuário, posição ou regra de duplicidade |
| `GET` | `/workouts` | Lista registros da tabela `workouts` | O nome representa exercícios, não sessões concluídas |
| `POST` | `/workout` | Cria um registro ligado a músculo | Sem usuário e com semântica ambígua |
| `GET` | `/workout_sets` | Lista todas as séries | Global, sem filtro e sem histórico |
| `GET` | `/workout_set/:id` | Busca uma série | Sem verificação de propriedade |
| `POST` | `/workout_set` | Cria uma série | Sem usuário e sem ordenação |

Nenhuma rota atual possui autenticação. Também faltam CORS, prefixo de versão,
updates, deletes, reorder, carregamento agregado, histórico e conclusão
transacional do treino.

Como o frontend ainda não consome essas rotas, não é necessário manter aliases
de compatibilidade: os sete endpoints atuais podem ser substituídos pelo
contrato versionado durante a migração.

### Divergência de domínio

- No frontend, `Muscle.exercises` representa a ficha de treino.
- No backend, `Muscle.Workouts` e a tabela `workouts` representam, na prática,
  esses exercícios.
- No frontend, `Workout` representa um treino já concluído.
- No backend, não existe uma entidade própria para sessão de treino concluída.
- `done` em `workout_sets` mistura configuração permanente com estado temporário
  da execução.

Antes de integrar, renomear conceitualmente `workouts` para `exercises` e
`workout_sets` para `exercise_sets`. Criar entidades separadas para execução.

## Modelo de dados alvo

As migrations SQL devem entrar no repositório antes dos novos repositories. O
projeto hoje não possui migrations, portanto o banco não é reproduzível apenas
com o código.

### `users`

- `id uuid primary key`
- `email text not null`
- `password_hash text not null`
- `display_name text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- índice único para `lower(email)`

Senhas devem ser armazenadas com Argon2id, salt aleatório e parâmetros gravados
junto ao hash em formato versionado. Nunca armazenar ou registrar a senha.

### `refresh_sessions`

- `id uuid primary key`
- `family_id uuid not null`
- `user_id uuid not null references users(id) on delete cascade`
- `token_hash bytea not null unique`
- `rotated_from_id uuid null references refresh_sessions(id)`
- `expires_at timestamptz not null`
- `revoked_at timestamptz null`
- `created_at timestamptz not null`
- `last_used_at timestamptz null`
- metadados opcionais e limitados de dispositivo, sem depender deles para autenticar

Cada refresh invalida o token anterior e cria outro. Reutilização de um token já
rotacionado deve revogar a família de sessões correspondente. Usar SHA-256 para
indexar o token aleatório no banco; o segredo original existe apenas no cookie.

### `muscles`

- adicionar `user_id uuid not null references users(id) on delete cascade`
- adicionar `position integer not null`
- manter `id`, `name`, `created_at` e `updated_at`
- índice por `(user_id, position)`

### `exercises`

Substitui a semântica atual da tabela `workouts`.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `muscle_id uuid not null references muscles(id) on delete cascade`
- `name text not null`
- `position integer not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `exercise_sets`

Substitui a semântica atual de `workout_sets`.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `exercise_id uuid not null references exercises(id) on delete cascade`
- `position integer not null`
- `target_reps integer not null check (target_reps >= 0)`
- `target_weight numeric(8,2) not null check (target_weight >= 0)`
- timestamps de criação e atualização

O campo `done` não pertence à série planejada.

### `workout_sessions`

Representa uma execução real.

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `muscle_id uuid null references muscles(id) on delete set null`
- `muscle_name text not null`
- `status text not null check (status in ('active', 'completed', 'cancelled'))`
- `started_at timestamptz not null`
- `completed_at timestamptz null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Criar restrição para impedir mais de uma sessão `active` do mesmo músculo para o
mesmo usuário.

### `workout_session_sets`

É um snapshot da execução e preserva histórico mesmo após renomear ou excluir
uma ficha.

- `id uuid primary key`
- `session_id uuid not null references workout_sessions(id) on delete cascade`
- `user_id uuid not null references users(id) on delete cascade`
- `exercise_id uuid null references exercises(id) on delete set null`
- `exercise_set_id uuid null references exercise_sets(id) on delete set null`
- `exercise_name text not null`
- `set_number integer not null`
- `reps integer not null check (reps >= 0)`
- `weight numeric(8,2) not null check (weight >= 0)`
- `completed boolean not null default false`
- `completed_at timestamptz null`

`lastWorkoutAt` será derivado da última `workout_session` concluída, evitando
duplicar estado em `muscles`.

As relações entre recursos ativos também devem garantir integridade de
proprietário no banco, por exemplo com chaves únicas e estrangeiras compostas
por `(user_id, id)`, além dos filtros obrigatórios nos repositories.

## Contrato HTTP alvo

### Convenções

- Base URL: `/api/v1`.
- JSON em `camelCase`.
- Datas em RFC 3339 UTC.
- Erro padronizado:

```json
{
  "error": {
    "code": "validation_error",
    "message": "invalid request",
    "details": {}
  }
}
```

- `400` para payload inválido, `401` para sessão ausente/inválida, `403` para
  ação proibida, `404` para recurso inexistente ou pertencente a outro usuário,
  `409` para conflito de estado e `422` para regra de negócio.
- Listas históricas usam cursor e `limit`; listas pequenas de configuração podem
  ser retornadas completas.

### Autenticação

| Método | Endpoint | Proteção | Finalidade |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Pública | Criar usuário e iniciar sessão |
| `POST` | `/api/v1/auth/login` | Pública | Validar credenciais, retornar access token e definir refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Refresh cookie | Rotacionar refresh e emitir novo access token |
| `POST` | `/api/v1/auth/logout` | Refresh cookie | Revogar sessão e limpar cookie |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Retornar o usuário autenticado |

Cadastro pode ser desabilitado por configuração se o produto não tiver
autoatendimento. Recuperação de senha e verificação de e-mail ficam fora do MVP,
mas devem ser adicionadas antes de uma abertura pública.

Resposta de login/refresh:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Daniel"
    },
    "accessToken": "jwt",
    "expiresIn": 900
  }
}
```

### Bootstrap da ficha

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/api/v1/training-plan` | Carregar músculos, exercícios, séries planejadas e último treino em uma chamada |

O bootstrap deve incluir apenas o histórico curto necessário para a tela, por
exemplo os últimos oito registros por série. Histórico extenso terá endpoint
próprio.

### Músculos

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/api/v1/muscles` | Listar músculos do usuário |
| `POST` | `/api/v1/muscles` | Criar músculo na última posição |
| `PATCH` | `/api/v1/muscles/:muscleId` | Renomear músculo |
| `DELETE` | `/api/v1/muscles/:muscleId` | Excluir músculo e dependências permitidas |
| `PATCH` | `/api/v1/muscles/reorder` | Reordenar atomicamente por `orderedIds` |

### Exercícios

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `POST` | `/api/v1/muscles/:muscleId/exercises` | Criar exercício com séries iniciais opcionais |
| `PATCH` | `/api/v1/exercises/:exerciseId` | Renomear exercício |
| `DELETE` | `/api/v1/exercises/:exerciseId` | Excluir exercício da ficha sem apagar snapshots históricos |
| `PATCH` | `/api/v1/muscles/:muscleId/exercises/reorder` | Reordenar exercícios atomicamente |

### Séries planejadas

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `POST` | `/api/v1/exercises/:exerciseId/sets` | Criar série planejada |
| `PATCH` | `/api/v1/exercise-sets/:setId` | Atualizar meta de repetições/carga |
| `DELETE` | `/api/v1/exercise-sets/:setId` | Excluir série planejada |
| `PATCH` | `/api/v1/exercises/:exerciseId/sets/reorder` | Reordenar séries atomicamente |
| `GET` | `/api/v1/exercise-sets/:setId/history` | Consultar histórico paginado da série |

### Sessões de treino

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `POST` | `/api/v1/workout-sessions` | Iniciar uma sessão e copiar a ficha para snapshots executáveis |
| `GET` | `/api/v1/workout-sessions/active?muscleId=:id` | Retomar uma sessão ativa após reload |
| `GET` | `/api/v1/workout-sessions/:sessionId` | Obter detalhes de uma sessão do usuário |
| `PATCH` | `/api/v1/workout-sessions/:sessionId/sets/:sessionSetId` | Salvar reps, carga e conclusão da série |
| `POST` | `/api/v1/workout-sessions/:sessionId/complete` | Validar e concluir o treino em transação |
| `DELETE` | `/api/v1/workout-sessions/:sessionId` | Cancelar uma sessão ativa |
| `GET` | `/api/v1/workout-sessions?muscleId=&cursor=&limit=` | Listar histórico de sessões concluídas |

Ao concluir, o servidor deve:

1. bloquear a sessão para atualização;
2. verificar proprietário e status `active`;
3. contar no mínimo 10 séries concluídas;
4. marcar a sessão como `completed`;
5. preservar os snapshots no histórico;
6. opcionalmente usar o valor executado como nova meta da série planejada,
   preservando o comportamento atual do frontend;
7. confirmar tudo na mesma transação.

### Payloads críticos

Resposta resumida de `GET /api/v1/training-plan`:

```json
{
  "data": {
    "muscles": [
      {
        "id": "uuid",
        "name": "Peito",
        "position": 0,
        "lastWorkoutAt": "2026-08-22T12:00:00Z",
        "exercises": [
          {
            "id": "uuid",
            "name": "Supino reto",
            "position": 0,
            "sets": [
              {
                "id": "uuid",
                "position": 0,
                "targetReps": 10,
                "targetWeight": 32,
                "history": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Criação de sessão:

```json
{ "muscleId": "uuid" }
```

Resposta de sessão:

```json
{
  "data": {
    "id": "uuid",
    "muscleId": "uuid",
    "muscleName": "Peito",
    "status": "active",
    "startedAt": "2026-08-22T12:00:00Z",
    "completedAt": null,
    "sets": [
      {
        "id": "uuid",
        "exerciseId": "uuid",
        "exerciseSetId": "uuid",
        "exerciseName": "Supino reto",
        "setNumber": 1,
        "reps": 10,
        "weight": 32,
        "completed": false
      }
    ]
  }
}
```

Atualização parcial de série executada:

```json
{ "reps": 10, "weight": 34, "completed": true }
```

Todos os endpoints de reorder recebem o mesmo formato e validam que a lista
contenha exatamente os IDs do recurso pai:

```json
{ "orderedIds": ["uuid-1", "uuid-2"] }
```

## Autenticação e segurança

### JWT de acesso

Usar `github.com/golang-jwt/jwt/v5`. O middleware deve fixar o algoritmo esperado
na configuração e validar assinatura, `iss`, `aud`, `exp` e `nbf`; nunca escolher
o algoritmo com base apenas no header recebido.

Claims mínimas:

- `sub`: UUID do usuário;
- `iss`: emissor configurado;
- `aud`: identificador da API;
- `iat`, `nbf` e `exp`;
- `jti`: identificador único do token.

TTL inicial recomendado: 10 a 15 minutos. Para este monólito, HS256 com segredo
aleatório forte é suficiente se o segredo ficar restrito à API. Se outro serviço
precisar apenas verificar tokens, preferir assinatura assimétrica.

### Refresh e cookies

- Gerar refresh token com CSPRNG.
- Persistir somente um hash do token.
- Rotacionar a cada uso e revogar em logout.
- Cookie de produção: `HttpOnly; Secure; SameSite=Lax` ou `Strict`; sem `Domain`
  quando possível e com `Path=/api/v1/auth`.
- Respostas de autenticação usam `Cache-Control: no-store`.
- Em desenvolvimento, documentar a exceção de `Secure=false` apenas para HTTP
  local.
- Se frontend e API forem cross-site e exigirem `SameSite=None`, adicionar
  proteção CSRF explícita. Preferir publicar ambos no mesmo site.

### Proteções adicionais

- Rate limit por IP e por conta em login, registro e refresh.
- Mensagem uniforme para e-mail ou senha inválidos.
- Limite de tamanho de payload e validação de strings/números.
- Logs não devem conter senha, JWT, refresh token ou `Authorization`.
- Todas as rotas de negócio ficam em um grupo Gin protegido pelo middleware.
- CORS permite apenas origens configuradas e headers necessários. Não combinar
  credenciais com `AllowAllOrigins`.
- Alteração de senha futura deve revogar todas as refresh sessions.
- No MVP, logout revoga o refresh e o access token já emitido expira naturalmente
  em até 15 minutos. Se houver requisito de revogação imediata, adicionar denylist
  por `jti` ou uma versão de token por usuário.

## Estrutura proposta no Go

```text
cmd/api/main.go
internal/
  auth/
    middleware.go
    password.go
    token.go
  config/
    config.go
  handlers/
    auth_handler.go
    muscle_handler.go
    exercise_handler.go
    exercise_set_handler.go
    workout_session_handler.go
  http/
    router.go
  models/
  repositories/
    user_repository.go
    refresh_session_repository.go
    muscle_repository.go
    exercise_repository.go
    exercise_set_repository.go
    workout_session_repository.go
  services/
    auth_service.go
    training_plan_service.go
    workout_session_service.go
migrations/
```

Handlers fazem parsing e resposta HTTP; services concentram regras e transações;
repositories concentram SQL. Não retornar models internos diretamente quando o
contrato HTTP exigir agregação ou ocultação de campos.

## Estrutura proposta no React

```text
src/
  app/
    providers.tsx
    router.tsx
  features/
    auth/
      api/auth-service.ts
      components/protected-route.tsx
      context/auth-context.tsx
      pages/login-page.tsx
      pages/register-page.tsx
      types.ts
    gym/
      api/gym-contracts.ts
      api/gym-mappers.ts
      api/gym-service.ts
      hooks/
      types.ts
    workout/
      api/workout-service.ts
      hooks/
  services/
    http/api-client.ts
    http/api-error.ts
```

Responsabilidades:

- `api-client.ts`: base URL, JSON, `Authorization`, `credentials: "include"`,
  erros tipados, `AbortSignal` e uma única tentativa de refresh.
- `auth-context.tsx`: usuário, access token apenas em memória, estados
  `loading/authenticated/anonymous`, login, logout e bootstrap por refresh.
- `gym-contracts.ts`: DTOs exatamente como trafegam pela API.
- `gym-mappers.ts`: conversão de DTOs para tipos usados na interface.
- `gym-service.ts`: CRUD e reorder da ficha.
- `workout-service.ts`: iniciar, retomar, atualizar e concluir sessões.

Usar uma biblioteca de server state, preferencialmente TanStack Query, para
cache, loading, mutations e invalidação. Manter em Context apenas autenticação e
estado estritamente global de interface. Não reconstruir um banco cliente dentro
de `GymProvider`.

Interfaces esperadas dos services:

```ts
type AuthService = {
  register(input: RegisterInput): Promise<AuthSession>
  login(input: LoginInput): Promise<AuthSession>
  refresh(): Promise<AuthSession>
  logout(): Promise<void>
  me(): Promise<User>
}

type GymService = {
  getTrainingPlan(signal?: AbortSignal): Promise<TrainingPlan>
  createMuscle(input: CreateMuscleInput): Promise<Muscle>
  updateMuscle(id: string, input: UpdateMuscleInput): Promise<Muscle>
  deleteMuscle(id: string): Promise<void>
  reorderMuscles(orderedIds: string[]): Promise<void>
  createExercise(muscleId: string, input: CreateExerciseInput): Promise<Exercise>
  updateExercise(id: string, input: UpdateExerciseInput): Promise<Exercise>
  deleteExercise(id: string): Promise<void>
  reorderExercises(muscleId: string, orderedIds: string[]): Promise<void>
  createExerciseSet(exerciseId: string, input: CreateExerciseSetInput): Promise<ExerciseSet>
  updateExerciseSet(id: string, input: UpdateExerciseSetInput): Promise<ExerciseSet>
  deleteExerciseSet(id: string): Promise<void>
  reorderExerciseSets(exerciseId: string, orderedIds: string[]): Promise<void>
  getExerciseSetHistory(id: string, cursor?: string): Promise<HistoryPage>
}

type WorkoutService = {
  start(muscleId: string): Promise<WorkoutSession>
  getActive(muscleId: string, signal?: AbortSignal): Promise<WorkoutSession | null>
  get(id: string, signal?: AbortSignal): Promise<WorkoutSession>
  updateSet(sessionId: string, setId: string, input: UpdateSessionSetInput): Promise<SessionSet>
  complete(sessionId: string): Promise<WorkoutSession>
  cancel(sessionId: string): Promise<void>
  list(input: WorkoutHistoryQuery): Promise<WorkoutHistoryPage>
}
```

As mutations de nome, reps e carga não devem gerar uma request por tecla.
Salvar no `blur`, no submit explícito ou com debounce; usar atualização otimista
com rollback em erro. Marcar uma série como concluída deve persistir
imediatamente para permitir retomada após reload.

Configuração do frontend:

```env
VITE_API_URL=/api/v1
```

Nenhum segredo pode usar prefixo `VITE_`. Em desenvolvimento, configurar proxy
do Vite de `/api` para `http://localhost:8080`. Em produção, preferir reverse
proxy no mesmo site.

## Variáveis da API

Adicionar ao `.env.example` sem valores reais:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
HTTP_ADDR=:8080
APP_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:5173
JWT_ISSUER=go-gym-track
JWT_AUDIENCE=go-gym-track-api
JWT_SIGNING_KEY=CHANGE_ME_WITH_AT_LEAST_32_RANDOM_BYTES
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=720h
COOKIE_SECURE=false
```

Validar configuração no startup e falhar com mensagem clara quando um segredo
obrigatório estiver ausente. Produção deve exigir `COOKIE_SECURE=true`.

## Sequência de implementação

### Fase 1 — Banco reproduzível e domínio

1. Adicionar ferramenta e diretório de migrations.
2. Criar `users` e `refresh_sessions`.
3. Migrar/renomear as tabelas de ficha para exercícios e séries planejadas.
4. Adicionar `user_id`, `position`, constraints, índices e timestamps.
5. Criar tabelas de sessão e snapshots.
6. Definir se dados antigos de desenvolvimento serão descartados ou atribuídos
   a um usuário seed. Isso é independente do `localStorage`, que será descartado.

### Fase 2 — Autenticação Go

1. Implementar hash Argon2id e testes.
2. Implementar emissor/validador JWT e testes de algoritmo e claims.
3. Implementar repositories e service de autenticação.
4. Criar register, login, refresh, logout e me.
5. Adicionar middleware, rate limit, CORS e erros padronizados.

### Fase 3 — API da ficha

1. Criar consulta agregada `training-plan`.
2. Implementar CRUD e reorder de músculos.
3. Implementar CRUD e reorder de exercícios.
4. Implementar CRUD e reorder de séries planejadas.
5. Garantir filtro por usuário em todos os repositories.

### Fase 4 — API de execução

1. Iniciar/retomar/cancelar sessão.
2. Persistir alterações de cada série executada.
3. Concluir sessão em transação, com regra mínima de 10 séries no servidor.
4. Implementar histórico paginado.

### Fase 5 — Autenticação React

1. Criar client HTTP e tratamento de erro.
2. Criar `AuthProvider`, bootstrap por refresh e rota de login.
3. Proteger `/` e `/muscles`.
4. Implementar retry único após `401`, com refresh single-flight.

### Fase 6 — Troca do armazenamento

1. Integrar bootstrap da ficha.
2. Integrar CRUD/reorder.
3. Integrar sessão ativa e conclusão.
4. Remover `gym-storage.ts` e seu uso no contexto.
5. Remover o seed do bundle de produção; dados de demonstração passam a ser
   migration/seed explícito de desenvolvimento.
6. Confirmar com busca que não resta `localStorage` ou `sessionStorage` em `src`.

### Fase 7 — Qualidade e operação

1. Testes unitários de services, mappers, auth e regras de treino.
2. Testes de integração dos handlers/repositories com PostgreSQL isolado.
3. Testes E2E de login, reload, CRUD, reorder, conclusão e logout.
4. Documentar comandos de migration, seed, backend e frontend.
5. Adicionar health/readiness endpoints fora do grupo autenticado.
6. Executar testes Go com escopo explícito: `go test ./cmd/... ./internal/...`.
   Neste monorepo, `go test ./...` também pode atravessar pacotes Go presentes em
   `frontend/node_modules`.

## Critérios de aceite

- Usuário consegue registrar, entrar, atualizar a página e continuar autenticado.
- Logout revoga o refresh token; refresh reutilizado é rejeitado.
- Access token expirado é renovado uma vez sem duplicar requests concorrentes.
- Nenhum token ou dado de treino é persistido em Web Storage.
- Dois usuários não conseguem listar, alterar ou inferir recursos um do outro.
- CRUD e reorder permanecem após reload.
- Sessão ativa pode ser retomada após reload.
- API rejeita conclusão com menos de 10 séries, independentemente do frontend.
- Duplo clique em concluir não cria dois históricos.
- Histórico continua legível após renomear/excluir itens da ficha.
- `go test ./cmd/... ./internal/...`, testes do frontend, lint e builds passam.
- Banco pode ser criado do zero apenas com migrations e configuração documentada.

## Referências de segurança

- JWT: https://www.rfc-editor.org/rfc/rfc7519.html
- Biblioteca JWT para Go: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- Middleware CORS oficial para Gin: https://github.com/gin-contrib/cors

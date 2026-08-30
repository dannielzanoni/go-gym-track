# Go Gym Track

A workout tracking application with a Go/Gin API, PostgreSQL, and a React/Vite
frontend. Data is isolated per user, and authentication uses short-lived JWTs
with a rotating refresh token stored in an `HttpOnly` cookie.

## Tech Stack

<p align="center">
  <a href="https://skillicons.dev">
    <img
      src="https://skillicons.dev/icons?i=go,react,ts,vite,tailwind,postgres,supabase,docker,nginx,vercel&perline=10"
      alt="Go, React, TypeScript, Vite, Tailwind CSS, PostgreSQL, Supabase, Docker, Nginx, and Vercel"
    />
  </a>
</p>

- **Backend:** Go, Gin, pgx, and PostgreSQL
- **Frontend:** React, TypeScript, Vite, and Tailwind CSS
- **Infrastructure:** Supabase, Docker, Nginx, Vercel, Render, and Fly.io

## Project Structure

```text
cmd/api/          HTTP server
cmd/migrate/      migration runner
internal/         domain, authentication, handlers, and repositories
migrations/       version-controlled PostgreSQL schema
frontend/         React application
```

The detailed API contract and architecture decisions are documented in
[`frontend/.agents/api-auth-plan.md`](frontend/.agents/api-auth-plan.md).

## Prerequisites

- A Go version compatible with the one declared in `go.mod`;
- PostgreSQL;
- Node.js and npm for the frontend.

## Configure the API in PowerShell

Go reads variables from the process environment; it does not load the `.env`
file automatically. For a local development session, define at least:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
$env:JWT_SIGNING_KEY = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

The other options and their development values are listed in `.env.example`.
Variables defined with `$env:` last only for the current PowerShell process and
the processes started from it.

### Create or Update the Database

```powershell
go run ./cmd/migrate
```

Before running this command against a database that still contains the previous
schema version, create a backup. The first migration preserves the old schema by
renaming its tables to `legacy_muscles`, `legacy_workouts`, and
`legacy_workout_sets`; it does not import those records for new users.

On Supabase, the following migration enables RLS and revokes GymTrack table
access from the Data API roles (`anon`, `authenticated`, and `service_role`). The
application must use the PostgreSQL connection string for the `postgres` role;
it does not access these tables through `supabase-js`, REST, or GraphQL.

You can also start the API with `RUN_MIGRATIONS=true`, but the dedicated command
is preferred because it makes schema changes explicit.

### Start the API

```powershell
go run ./cmd/api
```

By default, the API listens at `http://localhost:8080`. The public probes are
`GET /healthz` and `GET /readyz`; the application API is available under
`/api/v1`.

## Start the Frontend

In another PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8080`. To target another server, set
`VITE_API_URL`; this variable must contain only a public URL, never secrets.

## Authentication

- The JWT access token lasts 15 minutes by default and exists only in frontend
  memory.
- The refresh token lasts 30 days, is stored as a hash in the database, and is
  rotated after every use.
- The browser receives the refresh token in an `HttpOnly`, `SameSite=Lax` cookie;
  `Secure` is required when `APP_ENV=production`.
- The frontend does not use `localStorage` or `sessionStorage` for tokens or
  workouts.

In production, explicitly configure `CORS_ALLOWED_ORIGINS`, use HTTPS, and set
`COOKIE_SECURE=true`.

## Deployment

### API on Render

The [`Dockerfile`](Dockerfile) builds a static Go binary and runs it as a non-root
user in a distroless image. The API automatically uses the `PORT` provided by
Render and listens on `0.0.0.0`.

The [`render.yaml`](render.yaml) file can create the service as a Blueprint.
Before the first deployment, provide these values in the dashboard:

- `DATABASE_URL`: the Supabase connection string; on IPv4 networks, prefer the
  Session pooler on port `5432` and include `sslmode=require`;
- `CORS_ALLOWED_ORIGINS`: the final frontend URL, for example
  `https://go-gym-track.vercel.app`.

Render generates `JWT_SIGNING_KEY`. Previously applied migrations do not run at
startup because `RUN_MIGRATIONS=false`. The health check uses `GET /healthz`.

The Blueprint initially uses the `free` plan and the `virginia` region. Choose a
different region before creating the service if another one is closer to the
Supabase project, because Render does not allow changing it afterward.

### Frontend on Vercel

When importing this monorepo into Vercel:

1. Set **Root Directory** to `frontend`.
2. Keep [`Dockerfile.vercel`](frontend/Dockerfile.vercel) at that project root.
3. Create the `API_UPSTREAM` runtime variable with the Render origin and no
   trailing slash, for example `https://go-gym-track-api.onrender.com`.
4. Do not set `VITE_API_URL` to the Render domain; keep it as `/api/v1`.

Nginx serves the SPA and proxies `/api/*` to Render. From the browser's
perspective, the frontend and API remain on the same origin; this allows the
`HttpOnly`, `SameSite=Lax` refresh cookie to work without relying on third-party
cookies.

After Vercel generates the final URL, confirm that value in
`CORS_ALLOWED_ORIGINS` on Render and redeploy the API. Preview URLs must be added
explicitly if they also need API access.

### Alternative: API on Fly.io

The [`fly.toml`](fly.toml) file uses the same `Dockerfile`, the Sao Paulo region
(`gru`), internal port `10000`, and a health check at `/healthz`. Before the first
deployment, confirm that the global name defined in `app` is available and
change it if necessary.

```powershell
fly auth login
fly launch --no-deploy

fly secrets set DATABASE_URL="postgresql://.../postgres?sslmode=require"
fly secrets set JWT_SIGNING_KEY="SECRET_WITH_AT_LEAST_32_CHARACTERS"
fly secrets set CORS_ALLOWED_ORIGINS="https://your-frontend.vercel.app"

fly deploy
```

With `min_machines_running = 0`, the machine may stop while idle and restart on
the next request. To avoid a cold start, use `1` and account for the cost of
keeping a machine running.

## Validation

```powershell
go test ./cmd/... ./internal/... ./migrations/...
cd frontend
npm run lint
npm run test
npm run build
```

The Go tests are limited to project packages so they do not traverse possible Go
packages inside `frontend/node_modules`.

# DevOps — Local Development & CI

This document covers the **local-development slice** of Phase 19: the Docker
Compose stack, environment setup, and the GitHub Actions CI pipeline.
Staging/production infra (Terraform), CD promotion, observability, and DR are
tracked separately in the Phase 19 spec (SPEC §21) and are intentionally out of
scope here.

---

## 1. Prerequisites

- Docker Engine 24+ with the Compose v2 plugin (`docker compose`, not the legacy
  `docker-compose`).
- Node 20 (only needed if you also run Nx tooling on the host, e.g. migrations).

---

## 2. Environment setup

All configuration is driven by a local `.env` file. Start from the tracked
example, which documents **every** variable:

```bash
cp .env.example .env
# then edit .env and fill in real local values
```

Security notes:

- `.env` is git-ignored — **never commit real secrets**. `.env.example` holds
  placeholders only.
- Generate JWT secrets with `openssl rand -hex 32` and make the access/refresh
  secrets different from each other.
- Inside Compose, `DATABASE_URL` and `REDIS_URL` are **overridden** to reach the
  `postgres` / `redis` services by name. The `localhost` values in `.env` are for
  host-run tooling (e.g. Prisma migrate/seed from your terminal).

---

## 3. One-command local boot

```bash
docker compose up --build
```

Compose brings services up in dependency order, gated by healthchecks:

```
postgres ─┐
          ├─(healthy)─> api ─(healthy)─> web
redis ────┘        └──> worker
adminer ──> (after postgres healthy)
```

| Service    | Image / Build                     | Host port | Container port | Purpose                              |
| ---------- | --------------------------------- | --------- | -------------- | ------------------------------------ |
| `postgres` | `postgres:16-alpine`              | 5432      | 5432           | Primary database (named vol `pgdata`)|
| `redis`    | `redis:7-alpine`                  | 6379      | 6379           | Queues / cache (named vol `redisdata`)|
| `api`      | `docker/node.Dockerfile` (api)    | 3000      | 3000           | NestJS REST API (`/api`)             |
| `worker`   | `docker/node.Dockerfile` (worker) | —         | —              | BullMQ background worker             |
| `web`      | `docker/web.Dockerfile`           | 3001      | 3000           | Next.js frontend                     |
| `adminer`  | `adminer:4`                       | 8080      | 8080           | Web DB inspection UI                 |

Host ports are configurable via `.env` (`API_PORT`, `WEB_PORT`, `POSTGRES_PORT`,
`REDIS_PORT`, `ADMINER_PORT`).

Once up:

- API: <http://localhost:3000/api>
- Web: <http://localhost:3001>
- Adminer: <http://localhost:8080> (server `postgres`, user/db from `.env`)

Useful commands:

```bash
docker compose ps                 # status + health
docker compose logs -f api        # tail a service
docker compose up --build api     # rebuild + run just the API
docker compose down               # stop (keep volumes)
docker compose down -v            # stop AND wipe pgdata/redisdata
docker compose config             # validate + render the effective config
```

---

## 4. Image strategy

Two reusable multi-stage Dockerfiles live under `docker/`:

- **`docker/node.Dockerfile`** — shared by `api` and `worker`, parameterised by
  the `PROJECT` build-arg. Stage 1 installs the full toolchain and runs
  `nx build <project>` + `nx prune <project>` (the Nx webpack build has
  `generatePackageJson: true`, so `dist/apps/<project>` is self-contained: the
  bundle plus a pruned `package.json` + `package-lock.json`). Stage 2 is a slim
  `node:20-alpine` that installs prod deps only (`npm ci --omit=dev`), runs as an
  unprivileged `app` user, and starts `node main.js`.
- **`docker/web.Dockerfile`** — builds `apps/web` with `nx build web`, then runs
  `next start` in a slim runtime with production dependencies only.

> Future optimization: setting `output: 'standalone'` in
> `apps/web/next.config.js` would let the web image ship just
> `.next/standalone` + `.next/static` for a much smaller footprint. It requires
> an app-source change, so it is deferred to the FE app phase.

---

## 5. CI pipeline (GitHub Actions)

Workflow: `.github/workflows/ci.yml`, triggered on **push to `main`** and
**pull requests targeting `main`**.

Job **`main`** (Ubuntu, Node 20, npm cache):

```
checkout (fetch-depth: 0)  ->  setup-node@20 (+npm cache)  ->  npm ci
      ->  nrwl/nx-set-shas@v4  ->  nx affected -t lint test build
```

- `fetch-depth: 0` + `nrwl/nx-set-shas` give `nx affected` the base/head SHAs it
  needs (PR base branch, or last successful commit on push), so only affected
  projects are linted/tested/built.
- Runs are de-duplicated per ref via a `concurrency` group.

A commented **`migrate-and-deploy`** job is included as the placeholder for the
future CD stage (gated Prisma `migrate deploy`, SHA-tagged image build/push,
promote-by-tag to staging). It stays commented until staging infra and secrets
exist, keeping CI green against the current skeleton.

Target CI/CD shape (SPEC §21):

```
lint -> typecheck -> test (affected) -> build -> contract-tests
     -> image-build+scan -> (on main) migrate -> deploy
```

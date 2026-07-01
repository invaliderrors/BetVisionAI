# BetVision AI — Nx Monorepo

AI-assisted football analytics platform that turns match data into **transparent,
probabilistic betting recommendations**. This repository is an **Nx integrated monorepo**
with strict **Hexagonal Architecture (Ports & Adapters)** boundaries enforced by lint rules.

> See [`docs/BetVision-AI-SPEC.md`](docs/BetVision-AI-SPEC.md) for the full technical spec
> and [`docs/BetVision-AI-Implementation-Prompts.md`](docs/BetVision-AI-Implementation-Prompts.md)
> for the phased delivery plan. This README covers **Phase 1 (workspace scaffolding)** only.

---

## Stack

- **Nx** 23 (integrated monorepo, `project.json` per project, `tsconfig.base.json` path aliases)
- **NestJS** 11 — `apps/api`, `apps/worker`
- **Next.js** 16 + **TailwindCSS** v4 — `apps/web`
- **TypeScript** 5.9 · **ESLint** 9 (flat config) · **Prettier** 3 · **Jest** 30

## Workspace layout

```
betvision-ai/
├─ apps/
│  ├─ api/         # NestJS HTTP app  (inbound adapters / composition root)        [type:app, scope:api]
│  ├─ worker/      # NestJS app       (BullMQ consumers, standalone-capable)       [type:app, scope:worker]
│  └─ web/         # Next.js + Tailwind frontend                                   [type:app, scope:web]
├─ libs/
│  ├─ domain/          # Entities, Value Objects, Domain Services, Ports           [type:domain]
│  ├─ application/     # Use cases, orchestration, app DTOs                        [type:application]
│  ├─ infrastructure/  # Adapters: Prisma, providers, Redis, BullMQ, LLM, mappers  [type:infra]
│  ├─ contracts/       # Versioned REST DTO schemas shared FE+BE                   [type:contracts]
│  ├─ shared/          # Result type, error taxonomy, pure utils                   [type:shared]
│  ├─ ui/              # React/design-system component library                     [type:ui]
│  ├─ config/          # Typed env schema, feature flags                           [type:config]
│  └─ testing/         # Fakes, object-mothers, fixtures                           [type:testing]
├─ eslint.config.mjs   # flat config + @nx/enforce-module-boundaries
├─ nx.json · tsconfig.base.json · package.json
```

Every library exposes a TypeScript path alias defined in `tsconfig.base.json`
(`@betvision/domain`, `@betvision/application`, …).

## Architecture: layering & dependency direction

Dependencies may only point **inward**. The domain is framework-free (no NestJS, no Prisma,
no vendor SDKs). Contracts are the only thing shared with the frontend — the FE never imports
the domain.

```
ui            → contracts, shared
web (app)     → any lib (composition root)
api (app)     → any lib (composition root)
worker (app)  → any lib (composition root)
application   → domain, contracts, shared
infrastructure→ application, domain, contracts, config, shared
domain        → shared            (only)
contracts     → shared            (only)
config        → shared            (only)
shared        → (leaf — nothing)
testing       → domain, application, contracts, config, shared
```

**Forbidden** (and a lint error, not a code-review hope): `domain → infrastructure`,
`domain → application`, `contracts → domain`, anything `→ apps`, `ui → domain`.

## Tag scheme (enforced by `@nx/enforce-module-boundaries`)

Each project is tagged in its `project.json`. The boundary rules live in the root
`eslint.config.mjs` (`depConstraints`). `type:` encodes the architectural layer;
`scope:` marks which runtime an app belongs to.

| Source tag         | May depend on libs tagged                                                      |
| ------------------ | ------------------------------------------------------------------------------ |
| `type:domain`      | `type:domain`, `type:shared`                                                   |
| `type:contracts`   | `type:shared`                                                                  |
| `type:config`      | `type:shared`                                                                  |
| `type:shared`      | `type:shared` (leaf)                                                           |
| `type:application` | `type:domain`, `type:contracts`, `type:shared`                                 |
| `type:infra`       | `type:application`, `type:domain`, `type:contracts`, `type:config`, `type:shared` |
| `type:ui`          | `type:contracts`, `type:shared`                                                |
| `type:testing`     | `type:domain`, `type:application`, `type:contracts`, `type:config`, `type:shared` |
| `type:app`         | any lib (apps are the composition root)                                        |

Scope tags applied to the apps: `scope:api` (api), `scope:worker` (worker), `scope:web` (web).
They reserve the ability to later forbid, e.g., `web` from importing api-only infrastructure.

A deliberately wrong import (e.g. `domain` importing `@betvision/infrastructure`) fails
`nx lint domain` with:

```
A project tagged with "type:domain" can only depend on libs tagged with "type:domain", "type:shared"
  @nx/enforce-module-boundaries
```

## Common commands

```bash
npm install                         # install dependencies

npm run lint                        # nx run-many -t lint
npm run test                        # nx run-many -t test
npm run build                       # nx run-many -t build   (tsc build = type-check for libs)
npm run typecheck                   # alias of build (tsc type-checks every lib/app)
npm run verify                      # lint + test + build across all projects
npm run graph                       # open the project dependency graph

npx nx lint <project>               # e.g. nx lint domain
npx nx test <project>
npx nx build <project>
npx nx affected -t lint test build  # only what changed vs. the base branch
```

## Conventions

- **Hexagonal boundaries are law** — keep them green; never weaken `depConstraints` to make
  an import compile. Add a port/adapter instead.
- **Probabilities come only from statistical/ML models** (later phases). The LLM explains,
  never invents numbers. No guaranteed-win language anywhere.
- **All user-facing copy is i18n-keyed** (EN + ES) — no hardcoded strings in components.

> This is Phase 1 scaffolding: every lib ships a placeholder export plus one passing unit test.
> Business logic arrives in later phases per the implementation prompts.

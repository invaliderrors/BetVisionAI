# BetVision AI — Deferred Items Backlog

Running list of known follow-ups deliberately deferred during the phased build. Each item notes where it was deferred and where it should be resolved.

## Domain / Data

- **Match aggregate is minimal.** Carries team names + `competitionId` but not `homeTeamId`/`awayTeamId`/`seasonId`/`status`. `PrismaMatchRepository.save()` currently resolves teams by name (create-if-missing) and attaches to the *latest* season of the competition — a documented stopgap. *Deferred in Phase 4 → resolve in Phase 6 (Teams & Matches).*
- **Market taxonomy divergence.** Three taxonomies disagree: domain `MarketKey` union (e.g. `DOUBLE_CHANCE`, `CORRECT_SCORE`), the schema-design catalog keys (`DC`, `CS`, `OU_4_5`), and the persistence `MarketGroup` enum (8 values) vs domain `MarketGroup` (6). Phase 4 made `BettingMarket.key` follow the domain union so FKs resolve. Reconcile with an explicit mapping value object. *Deferred in Phase 4 → resolve in Phase 6/11.*
- **Elo / Poisson services are interface stubs.** `EloRatingService` and `PoissonGoalModel` are interfaces + TODO only. *Deferred in Phase 3 → implement in Phase 10 (statistical engine).*

## Infrastructure / DevOps

- **ioredis version duplication.** `bullmq` pins a nested `ioredis@5.10.1` vs top-level `5.11.1`, so the worker builds its own BullMQ connection instead of sharing the `REDIS_CLIENT` instance. Add an npm `overrides` to dedupe so one connection serves cache/health + BullMQ. *Deferred in Phase 2.*
- **Table partitioning not applied.** Partitioning DDL for `OddsSnapshot`/`AuditLog`/`MatchStats` is documented as commented SQL in the manual-SQL migration but not applied (cuid surrogate PKs conflict with partition-key-in-PK). Apply at volume. *Deferred in Phase 4.*
- **Prisma 7 upgrade blocked.** Pinned to Prisma 6.19.3 because Prisma 7 requires Node ≥22 (env is Node 20). Revisit on Node upgrade. *Deferred in Phase 4.*
- **Prisma seed config deprecated.** `package.json#prisma` seed config is deprecated; migrate to `prisma.config.ts`. *Deferred in Phase 4.*
- **Testcontainers not used.** DB-backed tests run against the compose Postgres (moved to host port 55432 due to a native Postgres on 5432) rather than Testcontainers, for Windows reliability. Consider wiring Testcontainers in CI. *Deferred in Phase 4.*

## Resolved

- ~~API readiness DB check stub~~ — wired to a real Prisma `SELECT 1` in Phase 4.
- ~~Worker reused API HTTP bootstrap~~ — converted to standalone context in Phase 2.

# BetVision AI — Deferred Items Backlog

Running list of known follow-ups deliberately deferred during the phased build. Each item notes where it was deferred and where it should be resolved.

## Domain / Data

- **OU_4_5 not a persistable market.** The Poisson model can compute `overProbability(4.5)` (used in a monotonicity test) but `MarketKey`/`BettingMarket` stop at `OU_3_5`, so it is not persisted. To offer it, add `OU_4_5` to `MarketKey`, `MARKET_GROUP`, `MARKET_VOLATILITY_BASELINE`, `STATISTICAL_MARKETS`, and the seed catalog. *Noted in Phase 10.*
- **Calibration uses identity params.** The calibration seam (`PlattCalibrator`/`IsotonicCalibrator`/`CalibrationMap`) exists but Phase 10 ships an `IdentityCalibrator`; real fitted params come from backtesting. *Deferred in Phase 10 → Phase 17.*

## Infrastructure / DevOps

- **ioredis version duplication.** `bullmq` pins a nested `ioredis@5.10.1` vs top-level `5.11.1`, so the worker builds its own BullMQ connection instead of sharing the `REDIS_CLIENT` instance. Add an npm `overrides` to dedupe so one connection serves cache/health + BullMQ. *Deferred in Phase 2.*
- **Table partitioning not applied.** Partitioning DDL for `OddsSnapshot`/`AuditLog`/`MatchStats` is documented as commented SQL in the manual-SQL migration but not applied (cuid surrogate PKs conflict with partition-key-in-PK). Apply at volume. *Deferred in Phase 4.*
- **Prisma 7 upgrade blocked.** Pinned to Prisma 6.19.3 because Prisma 7 requires Node ≥22 (env is Node 20). Revisit on Node upgrade. *Deferred in Phase 4.*
- **Prisma seed config deprecated.** `package.json#prisma` seed config is deprecated; migrate to `prisma.config.ts`. *Deferred in Phase 4.*
- **Testcontainers not used.** DB-backed tests run against the compose Postgres (moved to host port 55432 due to a native Postgres on 5432) rather than Testcontainers, for Windows reliability. Consider wiring Testcontainers in CI. *Deferred in Phase 4.*

## Auth / Security (from Phase 5)

- **Notification adapter is a no-op.** `LogNotificationAdapter` only logs; password-reset emails and report-ready notifications need a real email/push adapter. *Deferred in Phase 5 → wire in the notifications work (around Phase 12).*
- **Reset tokens stored raw in cache.** Password-reset tokens are kept unhashed in Redis; hash-at-rest. *Deferred in Phase 5 → Phase 18 hardening.*
- **No constant-time dummy verify on unknown email.** Login returns a generic error for unknown emails without a dummy hash verify, leaving a timing side-channel. Add a constant-time dummy hash. *Deferred in Phase 5 → Phase 18.*
- **No FREE subscription on register.** SPEC has User 1:1 Subscription, but registration does not auto-create a subscription row. *Deferred in Phase 5 → when the subscriptions module lands.*
- **OAuth / MFA (TOTP) not implemented.** SPEC lists them as optional. *Deferred in Phase 5 → Phase 18 / later.*
- **Full rate-limit hardening.** Only lenient throttling is wired; brute-force lockout, captcha, CORS allow-list are pending. *Deferred in Phase 5 → Phase 18.*

## API / UX (from Phase 6)

- **Endpoint publicity.** All `matches`/`teams`/`competitions` endpoints are `JwtAuthGuard`-protected. SPEC UX implies landing-page fixture **search** may be public — flip `GET /matches/search` (and possibly `teams` search) to public when the landing page is wired. *Deferred in Phase 6 → Phase 14.*
- **Team stats / odds summary are stubs.** `GET /teams/:id/stats` returns an empty-safe typed stub and `matchDetail.oddsSummary` is `{available:false}` until ingestion/feature jobs and odds land. *Deferred in Phase 6 → Phases 8–11.*

## Frontend (from Phase 13)

- **Web builds with webpack, not Turbopack.** Turbopack hard-errors on `libs/contracts`/`libs/shared` because they declare `"type": "commonjs"` (correct for the NestJS backend) but are authored in ESM. `apps/web/project.json` pins `--webpack`. To re-enable Turbopack, have contracts/shared drop `"type"` or ship `.cjs`. *Deferred in Phase 13.*
- **`middleware.ts` → `proxy.ts` rename.** Next 16 deprecation warning (benign; next-intl's `createMiddleware` still uses the middleware convention). *Deferred in Phase 13.*
- **`libs/ui` declares `react` as a dependency, not a peer.** Works and lint-clean in this hoisted monorepo; move to peer if preferred. *Deferred in Phase 13.*
- **Frontend stubs to wire.** Dashboard predictions/watchlist and match search are typed local stubs (`TODO(backend …)`) until `GET /predictions?mine`, `/watchlist`, `/matches/search` are consumed. *Deferred in Phase 13 → Phase 14/15.*
- **RiskSlider not yet built.** The risk-appetite slider UI is deferred to Phase 14 (Match Analysis page). *Deferred in Phase 13 → Phase 14.*

## AI / Reports (from Phase 12)

- **RAG is a dev stub.** `DevRagRetriever` returns curated labelled dev snippets; replace with a pgvector-backed retriever over a licensed, embedded corpus. *Deferred in Phase 12.*
- **Live LLM not exercised here.** `AnthropicLlmAdapter` (model `claude-opus-4-8`) is wired behind `LLM_MODE=live` + `ANTHROPIC_API_KEY`, but only the deterministic `TemplateLlmAdapter` runs/tests in this environment (no key). Provide a key + set `LLM_MODE=live` to exercise it; optionally add structured-output/thinking config. *Deferred in Phase 12.*
- **Report language switch regenerates prose.** Numbers are already reused; a future optimization short-circuits to `findLatest(predictionId, language)` when an immutable report already exists. *Deferred in Phase 12.*
- **api e2e runs serially** (`apps/api/jest.config.cts maxWorkers:1`) because `predictions.e2e` + `reports.e2e` share the `dev-match-demo-1` fixture with destructive cleanup. Isolate fixtures per suite to re-enable parallel workers. *Deferred in Phase 12.*

## Frontend analysis (from Phase 14)

- **`POST /predictions` is synchronous.** UI shows a step chip row + skeleton; move Run+Detect to a BullMQ job with SSE progress and switch the stepper to live updates. *Deferred in Phase 14.*
- **No value-only re-run endpoint.** The RiskSlider re-analyze re-calls full `POST /predictions`; add an endpoint that re-runs only value detection against cached model probabilities (backend already separates scoring from gating) and point the slider at it. *Deferred in Phase 14.*
- **LLM narrative not yet shown in the report UI.** `PredictionReport` renders numbers + rationale codes; wire `GET /reports/:id` (Phase 12) narrative/sources/staleness into it. *Deferred in Phase 14.*

## LLM Research / Analyze (free-text fixtures)

- **`POST /analyze` is synchronous and slow.** A live research call (Claude + web search) takes ~2–4 min; the endpoint blocks. Move to a BullMQ job with SSE progress (same fix as `/predictions`). *Deferred in the analyze slice.*
- **Analyses are not persisted.** `AnalyzeFixtureUseCase` runs the pipeline over request-scoped **in-memory** ports, so a research analysis isn't saved (no history). Persisting needs domain-port additions: `TeamRepositoryPort` has no `save`, there is no team-stats/match-stats write port, and `Match.save` requires competition/season FKs. Add write ports + upsert research entities to enable history. *Deferred in the analyze slice.*
- **Research inputs are AI estimates.** `AnthropicFixtureResearchProvider` (model `claude-opus-4-8`, web-search tool) estimates form/goals/odds from public info — provenance `LLM_RESEARCH`, clearly disclaimed, NOT a licensed feed. Swap for a licensed adapter behind `FIXTURE_RESEARCH_PORT` when a data deal exists. *By design; revisit with real data.*
- **Report narrator ran in template mode for the live smoke** (one paid call). Set `LLM_MODE=live` to route the report narrative through the live Anthropic explainer too (already wired). *Deferred.*
- **Frontend free-text analyze not yet wired** — the UI still searches the seeded DB; add an "analyze any fixture" box calling `POST /analyze`. *In progress.*

## Resolved

- ~~Market taxonomy divergence~~ — resolved in Phase 11 via `OddsMarketMapping` (canonical selection folding + documented group collapse); model markets join odds markets deterministically.
- ~~Elo / Poisson services were interface stubs~~ — implemented in Phase 10 (golden-tested Elo + Poisson/Dixon-Coles, reproducible probabilities).
- ~~Match aggregate was minimal / name-resolution stopgap~~ — fleshed out with real FK ids in Phase 6 (round-trip test proves persisted `homeTeamId`/`seasonId` match input).
- ~~API readiness DB check stub~~ — wired to a real Prisma `SELECT 1` in Phase 4.
- ~~Worker reused API HTTP bootstrap~~ — converted to standalone context in Phase 2.

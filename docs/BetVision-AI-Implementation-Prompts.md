# BetVision AI — Step-by-Step Implementation Prompts

> Companion to `BetVision-AI-SPEC.md`. Each phase below is a **ready-to-paste prompt** for an AI coding agent (Claude Code). Run them **in order**, one per session; each builds on the previous. Prompts are in English (developer-facing); the **product itself ships bilingual EN/ES** via i18n (see Feature Spec A).

---

## How to use these prompts

1. Open a fresh agent session at the repo root.
2. Paste the **Global Conventions** block once (or keep it in `CLAUDE.md` so every session has it).
3. Paste **one phase prompt**, let it complete, review, commit, then move to the next.
4. Every phase ends with a **Definition of Done (DoD)** — do not advance until it passes.
5. Two cross-cutting features — **i18n (EN/ES)** and **Risk Appetite slider** — are specified once below and referenced by the phases that touch them.

---

## Global Conventions (paste once / keep in CLAUDE.md)

```
You are building BetVision AI per docs/BetVision-AI-SPEC.md. Honor these rules in EVERY phase:

STACK: Nx monorepo · NestJS (api + worker) · Next.js + TailwindCSS (web) · TypeScript ·
PostgreSQL + Prisma · Redis + BullMQ · zod contracts · OpenAPI/Swagger.

ARCHITECTURE: Hexagonal (Ports & Adapters). Dependency direction is law:
  domain → shared only · contracts → shared only · application → domain/contracts/shared ·
  infrastructure → application/domain/contracts/config/shared · apps = composition root.
  domain has NO framework/Prisma/vendor imports. Enforce with Nx tags + @nx/enforce-module-boundaries.

PRODUCT GUARDRAILS (non-negotiable):
  - Probabilities come ONLY from statistical/ML models + backtesting. The LLM explains, never invents numbers.
  - No guaranteed-win language anywhere. No bet execution in v1.
  - Every user-facing string is i18n-keyed (EN + ES). No hardcoded copy.
  - Responsible-gambling + age gating are first-class.

QUALITY: TDD where practical. Unit-test domain/value-objects. Contract-test provider adapters.
  Validate input at controller (zod/class-validator) AND in domain value objects.
  Keep functions small; name like the surrounding code; no dead abstractions.

DELIVERY: At the end of each phase, run lint + typecheck + affected tests and report results.
  Do not claim done without green output. Update docs/ and seed/ where relevant.
```

---

## Feature Spec A — Internationalization (EN / ES)

**Goal:** the entire product is usable in English and Spanish, switchable at runtime, with locale persisted per user.

**Backend (`apps/api`, `libs/*`):**
- All API error messages, validation messages, and any user-facing strings come from **message catalogs** keyed by code, resolved by the request's `Accept-Language` header or the authenticated user's `locale`.
- Use `nestjs-i18n` (or a thin `I18nPort` in `libs/domain` + adapter in `libs/infrastructure`) so the domain stays framework-free. Domain/use-cases return **error codes + params**, never localized strings; localization happens at the interface layer.
- LLM report generation accepts a `language: 'en' | 'es'` parameter; the narrative is produced in that language; `AnalysisReport.language` is persisted. A user can request the same prediction's report in the other language (re-render narrative from the same numbers — numbers never change between languages).
- `User.locale` defaults from registration; `PATCH /users/me` can change it.

**Frontend (`apps/web`, `libs/ui`):**
- Use **`next-intl`** with `messages/en.json` and `messages/es.json`. No hardcoded text in components — only `t('key')`.
- Locale routing strategy: `/[locale]/...` segments (or cookie-based) — pick segment-based for SSR + shareable localized URLs.
- A language switcher in the header; selection persists to cookie + (if logged in) `PATCH /users/me { locale }`.
- Locale-aware formatting: dates, numbers, and **odds** (decimal default; allow display format per locale later).
- All `libs/ui` components accept text via props/children, never embed copy.

**Contracts (`libs/contracts`):** request DTOs that produce narratives include `language`. Catalog keys are shared constants so FE/BE never drift.

**Definition of Done (i18n, applied wherever relevant):** switching language updates 100% of visible copy; no string literals in components (lint rule/Storybook check); reports render in EN and ES from identical numbers.

---

## Feature Spec B — Risk Appetite (the "risk level" slider)

**Concept:** the user sets how risky they want recommendations to be using a **slider (bar)**. This value **filters and ranks** which bets are surfaced and how stake is suggested — it **never changes the underlying model probabilities** (those stay objective and calibrated). Risk appetite shapes *selection*, not *truth*.

**Domain model (`libs/domain`):**
- Value Object `RiskAppetite` — integer `0..100` (0 = most conservative, 100 = most aggressive). Validated, immutable. Convenience buckets: `conservative (0–33)`, `balanced (34–66)`, `aggressive (67–100)`.
- Domain service `RiskProfileService.resolve(riskAppetite): RiskProfile` maps the slider to concrete gating parameters:
  ```
  RiskProfile = {
    minEdge: number,            // higher when conservative (demand bigger edge)
    minConfidence: 'low'|'medium'|'high',
    maxMarketVolatility: 'low'|'medium'|'high', // excludes high-variance markets when conservative
    kellyFraction: number,      // e.g. 0.10 conservative → 0.50 aggressive (NEVER 1.0)
    maxStakePctCap: number,     // hard cap, conservative smaller
    allowedMarketGroups: MarketGroup[], // conservative excludes correct-score, anytime-scorer
  }
  ```
  Example monotonic mapping (tune via backtests, document the table):
  | Bucket | minEdge | minConfidence | maxVolatility | kellyFraction | maxStakePct |
  |---|---|---|---|---|---|
  | Conservative | 0.05 | high | low | 0.10 | 1% |
  | Balanced | 0.03 | medium | medium | 0.25 | 2% |
  | Aggressive | 0.015 | low | high | 0.50 | 3% |

**Application (`libs/application`):**
- `DetectValueBetsUseCase` accepts `riskAppetite`; it resolves a `RiskProfile` and uses it to **gate** (`edge ≥ minEdge`, `confidence ≥ minConfidence`, `marketVolatility ≤ maxMarketVolatility`, market group allowed) and to **size stake** (fractional Kelly × profile, capped at `maxStakePct`).
- Best bet = highest risk-adjusted EV among selections passing the profile. If none pass: honest `NO_VALUE_FOUND` for that appetite (UI suggests trying a higher-risk setting, with a warning that higher risk ≠ higher expected value).

**Contracts (`libs/contracts`):**
- `CreatePredictionRequest` gains `riskAppetite: number (0..100, default 33)`.
- `PredictionResultDto` / `AnalysisReportDto` echo the `riskAppetite` used and the resolved bucket, so reports are reproducible and the UI can show "analyzed at risk 45/100 (balanced)".

**Frontend (`apps/web`, `libs/ui`):**
- `RiskSlider` component (accessible: keyboard + ARIA `slider` role, labeled in EN/ES) on the Match Analysis page. Live preview label (Conservative/Balanced/Aggressive) and a one-line plain-language explanation of what changes.
- Changing the slider and re-analyzing re-runs **only value detection + report narrative** against the *same cached model probabilities* when available (cheap), not the full provider+model pipeline.
- The report clearly states the chosen risk level and reminds: higher risk = higher variance, not guaranteed higher returns.

**Reproducibility:** `Prediction` already stores `modelVersion` + `inputSnapshotHash`; `Recommendation`/report additionally store the `riskAppetite` used, so the same fixture at the same risk reproduces identically.

**Definition of Done (risk appetite):** slider value flows end-to-end; recommendations measurably change across buckets in tests; model probabilities are byte-identical regardless of risk setting; conservative excludes high-variance markets; stake never exceeds the bucket cap.

---

# Phase Prompts

---

## Phase 1 — Nx Monorepo Setup

```
GOAL: Create the Nx workspace and enforce hexagonal boundaries from day one.

TASKS:
1. Init an Nx monorepo (npm). Add apps: api (NestJS), worker (NestJS standalone), web (Next.js).
2. Create libs: domain, application, infrastructure, contracts, shared, ui, config, testing.
3. Configure tsconfig path aliases for every lib.
4. Add ESLint + Prettier; enable @nx/enforce-module-boundaries.
5. Tag every project (type:domain|application|infra|contracts|ui|config|app, scope:web|api|worker)
   and encode the dependency rules from Global Conventions as boundary constraints.
6. Add a placeholder export + a unit test to each lib so they build/test.
7. Add a CI-less local script set: nx lint, nx typecheck, nx test, nx build.

DoD:
- `nx run-many -t lint test build` is green.
- A deliberately wrong import (e.g. domain importing infrastructure) FAILS lint. Prove it, then revert.
- README documents the lib layering and the tag scheme.
DO NOT: add business logic yet. Keep libs thin.
```

---

## Phase 2 — Base NestJS Backend + i18n foundation

```
GOAL: Boot api + worker with cross-cutting concerns and bilingual error messages.

TASKS:
1. apps/api: Nest app with global ValidationPipe, a global exception filter producing the
   response envelope { data, error } with typed error codes + correlation id.
2. Structured logging (pino) with request correlation; basic OpenTelemetry tracing hooks.
3. libs/config: zod-validated env loader (DATABASE_URL, REDIS_URL, JWT secrets, provider keys,
   DEFAULT_LOCALE). Fail fast on invalid env.
4. Health: GET /health (liveness), GET /health/ready (db+redis when wired).
5. Swagger at /api/docs.
6. i18n (Feature Spec A, backend slice): integrate nestjs-i18n with en + es catalogs. Add an
   I18nPort in libs/domain and an adapter in libs/infrastructure so domain returns codes, not strings.
   Exception filter localizes error codes via Accept-Language (fallback DEFAULT_LOCALE).
7. apps/worker: standalone Nest context that connects to Redis (BullMQ) and logs ready.

DoD:
- /health, /health/ready, /api/docs respond.
- Same error returns English vs Spanish message based on Accept-Language. Add a test proving both.
- Invalid env aborts boot with a clear message.
```

---

## Phase 3 — Hexagonal Foundation

```
GOAL: Establish the ports/adapters skeleton and shared primitives.

TASKS:
1. libs/shared: Result<T,E> type, error taxonomy (DomainError with code+params), guard helpers,
   units/date utils (UTC), Money/Percentage helpers.
2. libs/domain: base Entity/AggregateRoot, ValueObject base, ID generation port (IdGeneratorPort),
   ClockPort, EventBusPort interfaces.
3. Define outbound port interfaces (empty signatures ok): MatchRepositoryPort, OddsRepositoryPort,
   SportsDataProviderPort, OddsProviderPort, RefereeStatsProviderPort, WeatherProviderPort,
   InjuryProviderPort, LineupProviderPort, TeamStatsProviderPort, PlayerStatsProviderPort,
   LlmExplanationPort, CachePort, FeatureStorePort, PredictionModelPort, AuditLogPort,
   NotificationPort, I18nPort.
4. libs/testing: fake implementations for the ports above + object-mother builders.
5. Wire one trivial sample use case in libs/application that uses a fake port; unit-test it.

DoD:
- Sample use case passes with a fake adapter, zero IO.
- All ports compile; fakes available from libs/testing.
DO NOT: add ports you will not use; no vendor SDKs in domain.
```

---

## Phase 4 — Database & Prisma

```
GOAL: Persistence layer for the canonical model with migrations and seed.

TASKS:
1. Add Prisma to libs/infrastructure. Model the entities from SPEC §9: User, Role, Team, Player,
   Competition, Season, Match, MatchStats, TeamStats, PlayerStats, Referee, RefereeStats,
   OddsSnapshot, BettingMarket, Prediction, PredictionInput, PredictionResult, Recommendation,
   DataSource, AnalysisReport, AuditLog, Subscription, UserWatchlist.
2. Add User.locale (default from DEFAULT_LOCALE) and the risk fields:
   - Recommendation.riskAppetite (int), AnalysisReport.riskAppetite (int) + resolved bucket.
   - PredictionResult keeps modelProbability/impliedProbability/edge/expectedValue/suggestedStakePct/
     confidence/risk; risk gating is computed per request, not stored on the probability.
3. Indexes per SPEC (trigram on names, GIN on externalIds jsonb, composite on OddsSnapshot
   (matchId,market,selection,capturedAt), Match (kickoffUtc) etc.). Note partitioning candidates.
4. Repository adapters implementing the repo ports from Phase 3, with mappers (persistence ↔ domain).
5. Migrations + idempotent seed: roles (user/analyst/admin), BettingMarket catalog (with group +
   volatility baseline used by Risk Appetite), a few competitions/seasons for dev.
6. Testcontainer-based repository tests (real Postgres).

DoD:
- prisma migrate + seed run clean; repo tests green.
- BettingMarket catalog includes a `group` and `volatility` so Risk Appetite can filter by them.
DO NOT: leak Prisma types out of libs/infrastructure.
```

---

## Phase 5 — Auth & Users (+ age gate, RG, locale)

```
GOAL: Secure accounts with RBAC, age gating, responsible-gambling self-limits, and locale.

TASKS:
1. auth module: register, login, refresh (rotating httpOnly cookie + reuse detection), logout,
   forgot/reset password. Argon2id hashing. JWT access (~15m) + refresh family revocation.
2. Validation: email RFC + normalize; password ≥12 with complexity; ageConfirmed === true and
   acceptedTerms === true required at register; store ageConfirmedAt.
3. RBAC: roles user/analyst/admin + permission checks. Route guards + a policy check at use-case
   boundary.
4. users module: GET/PATCH /users/me (locale included), POST /users/me/self-limit (RG limits),
   POST /users/me/export + DELETE /users/me (GDPR), all audited via AuditLogPort.
5. i18n: all auth/user error + validation messages keyed EN/ES.
6. Security tests: authz matrix, age-gate enforcement, refresh rotation/reuse.

DoD:
- Full auth flow works; protected route rejects without/with wrong role.
- Registration blocked without age + terms confirmation.
- Changing locale via PATCH /users/me persists and affects subsequent localized responses.
```

---

## Phase 6 — Teams & Matches + Fixture Resolution

```
GOAL: Core football aggregates and natural-language fixture resolution.

TASKS:
1. Entities + repos for Team, Player, Competition, Season, Match (+ MatchStats read model).
2. ResolveFixtureUseCase: parse free text ("Real Madrid vs Barcelona"), match against teams
   (trigram search), disambiguate by competition/date, return ranked candidates with a confidence
   score. Handle "no match" with suggestions.
3. Endpoints: GET /matches/search?q=, GET /matches/:id (canonical match + stats + assigned referee
   + odds summary placeholder), GET /teams/:id (+ /stats), GET /competitions.
4. Contract DTOs in libs/contracts (MatchSearchResponse with confidence; TeamRef).
5. i18n for messages; locale-aware kickoff formatting handled on FE (store UTC).

DoD:
- "Real Madrid vs Barcelona" returns ranked candidates with confidence.
- Ambiguous input returns multiple candidates; nonsense returns NO_MATCH with suggestions.
- Contract tests validate responses against zod schemas.
```

---

## Phase 7 — Provider Integrations (behind ports)

```
GOAL: Real data behind the outbound provider ports — swappable, resilient, contract-tested.

TASKS:
1. Implement ONE primary adapter per capability (start with a single licensed provider; CONFIRM ToS
   first): SportsDataProviderPort, OddsProviderPort, RefereeStatsProviderPort, InjuryProviderPort,
   LineupProviderPort, WeatherProviderPort, Team/PlayerStatsProviderPort.
2. Per adapter: API key from config/vault, rate-limit + quota handling, retry with backoff,
   circuit breaker, response → canonical DTO mapping, provenance stamping (provider, fetchedAt,
   payload hash), staleness metadata.
3. Wire DataSource registry + health (status, lastSyncAt, latencyMs, errorRate).
4. Contract tests per adapter against RECORDED fixtures; a schema-drift test that fails when the
   provider response no longer matches expectations.
5. Keep the fake adapters (libs/testing) in sync as the reference implementation.

DoD:
- A live (or recorded) fetch populates canonical DTOs with provenance.
- Killing the provider trips the circuit breaker and returns last-known + staleness, not a crash.
- Contract + schema-drift tests green.
DO NOT: scrape; do not hardcode keys; do not couple use-cases to a specific provider.
```

---

## Phase 8 — Ingestion & Normalization (BullMQ)

```
GOAL: Idempotent, scheduled, event-driven ingestion into the canonical store.

TASKS:
1. Set up BullMQ queues in apps/worker: ingest:fixtures, ingest:stats, ingest:odds,
   ingest:injuries-lineups, ingest:referee, ingest:weather, normalize.
2. Each job: idempotent upsert by natural key/externalIds, provenance + staleness, retry/backoff,
   dead-letter on terminal failure.
3. EventBusPort adapter publishes domain events (MatchDataIngested → triggers normalize → ...).
4. Schedulers: repeatable jobs (odds frequent; injuries/lineups intensify near kickoff).
5. Bull Board dashboard (admin-only, guard later) + per-queue metrics (depth, latency, failures).

DoD:
- Running a sync populates canonical tables; re-running causes NO duplicates (prove with a test).
- A forced failure lands in the dead-letter queue and is visible.
```

---

## Phase 9 — Feature Engineering Pipeline

```
GOAL: Reproducible, versioned, leakage-free feature vectors.

TASKS:
1. features module: ComputeFeaturesUseCase builds the vector — weighted recent form, rolling
   averages (goals, xG, corners, cards), home/away splits, head-to-head, strength-of-schedule,
   rest days, absence-impact (from injuries/suspensions), referee tendencies.
2. STRICT as-of-kickoff cutoff: never use post-kickoff data (no leakage). Add tests proving cutoff.
3. FeatureStorePort + cache by (matchId, featureVersion). Bump featureVersion on formula changes.
4. Persist PredictionInput (the exact feature vector) for reproducibility.

DoD:
- Same (matchId, featureVersion) yields a byte-identical vector (deterministic test).
- A leakage test fails if any feature reads data dated ≥ kickoff.
```

---

## Phase 10 — First Statistical Prediction Engine

```
GOAL: Calibrated baseline probabilities for 1X2, Over/Under, BTTS.

TASKS:
1. Domain services: EloRatingService, PoissonGoalModel (with Dixon-Coles low-score adjustment),
   score-matrix builder. Pure, unit-tested with golden values.
2. RunPredictionUseCase: features → expected goal rates → score matrix → market probabilities
   (1X2, OU lines, BTTS). Persist Prediction + PredictionInput(hash) + PredictionResult[].
3. Calibration: apply isotonic/Platt scaling fitted on historical outcomes; expose calibration
   metrics (Brier, log-loss) in tests.
4. Property tests: probabilities ∈ [0,1], 1X2 sums to 1, monotonicity sanity checks.
5. PredictionModelPort kept clean so a future Python model-service can slot in.

DoD:
- Deterministic golden tests pass for known inputs.
- Calibration metrics computed on a held-out sample; probabilities reproducible from snapshot hash.
DO NOT: invent "exact" guarantees; no market is sold as certain.
```

---

## Phase 11 — Odds, Value Betting & Risk Appetite

```
GOAL: Detect value vs market odds and apply the user's Risk Appetite (Feature Spec B).

TASKS:
1. odds module: persist OddsSnapshot, expose latest + movement history; compute implied probability
   per selection and DE-MARGIN (remove overround) for a fair baseline.
2. Domain: ValueCalculator (edge = modelProb − impliedProb; EV = p*(odds-1) - (1-p)),
   KellyStakeService (fractional), RiskAppetite VO (0..100), RiskProfileService.resolve().
3. DetectValueBetsUseCase(riskAppetite): resolve RiskProfile, GATE selections by minEdge,
   minConfidence, maxMarketVolatility, allowed market groups; SIZE stake = fractionalKelly*profile
   capped at maxStakePct. Pick best bet = top risk-adjusted EV passing gates; rank alternatives.
4. If nothing passes: return NO_VALUE_FOUND for that appetite (honest), with a hint that a higher
   risk setting MAY surface more selections (and a warning that risk ≠ expected value).
5. Contracts: CreatePredictionRequest.riskAppetite (0..100, default 33); echo riskAppetite + bucket
   in results/report.

DoD:
- Same fixture at risk=10 vs risk=90 yields DIFFERENT recommendations but IDENTICAL model
  probabilities (prove both in tests).
- Conservative bucket excludes high-variance markets (correct score / anytime scorer).
- Suggested stake never exceeds the bucket's maxStakePct cap (property test).
```

---

## Phase 12 — AI-Generated Reports (LLM + RAG, bilingual)

```
GOAL: Explainable, source-cited, bilingual narrative that NEVER alters the numbers.

TASKS:
1. ai-analysis module: LlmExplanationPort + adapter (Anthropic Claude). RagRetrieverPort + adapter
   over a vector store (pgvector) of curated, licensed source snippets.
2. GenerateReportUseCase: pass ONLY computed numbers (probabilities, edges, EV, stake, confidence,
   risk, chosen riskAppetite/bucket) + retrieved sources + language ('en'|'es') to the LLM.
   The LLM writes summary, recent-form prose, risks, key variables, reasoning, market rationale.
3. Guardrail validator (post-generation): assert narrative does not contradict the numbers, contains
   the responsible-gambling warning, includes citations, and is in the requested language. On
   failure: regenerate once, else fall back to a templated report.
4. reports module: assemble immutable AnalysisReport (stores language + riskAppetite), cache in
   Redis, persist in Postgres. Allow re-rendering the SAME prediction's narrative in the other
   language WITHOUT recomputing numbers.

DoD:
- A report renders in EN and ES from byte-identical numbers.
- Guardrail test rejects a narrative that contradicts the numbers or omits the RG warning.
- Report records which riskAppetite/bucket produced its recommendations.
DO NOT: let the LLM output or modify any probability.
```

---

## Phase 13 — Frontend Dashboard + i18n shell

```
GOAL: Next.js app shell with bilingual UI, auth, dashboard, watchlist, design system.

TASKS:
1. apps/web: Next.js App Router + Tailwind. Generate a typed API client from libs/contracts.
2. i18n (Feature Spec A): next-intl with /[locale]/ segment routing, messages/en.json + es.json,
   header language switcher persisting to cookie + PATCH /users/me. ZERO hardcoded strings.
3. Auth flow (login/register with age gate + terms + locale), httpOnly-cookie session handling.
4. Dashboard: stat cards, recent predictions, upcoming fixtures, watchlist; RG reminder footer.
5. libs/ui: design system tokens (sober, non-celebratory risk palette), base components
   (Button, Card, Table, Skeleton, RiskBadge, ConfidenceBar). Storybook + axe a11y checks.
   Components take copy via props — never embed text.

DoD:
- Switching EN/ES updates 100% of visible copy; a lint/Storybook check fails on hardcoded strings.
- login → dashboard → add to watchlist works; WCAG AA on core screens.
```

---

## Phase 14 — Match Analysis Page + Risk Slider

```
GOAL: Search a fixture, set Risk Appetite via a slider, run analysis, view the report.

TASKS:
1. Match search UI (typeahead → ranked candidates with confidence, disambiguation chips).
2. RiskSlider component (Feature Spec B): accessible bar (ARIA slider role, keyboard), value 0..100,
   live bucket label (Conservative/Balanced/Aggressive) + one-line plain-language effect, fully
   i18n'd. Default 33.
3. Analyze action: POST /predictions { matchId, riskAppetite }; show job progress via polling or SSE
   on jobId with a stepper (ingest → features → predict → value → report).
4. Report view: summary, form charts, market table, BEST BET card, alternatives, confidence bar,
   risk meter, sources, staleness badges, and the explicit "analyzed at risk N/100 (bucket)" line
   plus the reminder that higher risk = higher variance, not guaranteed higher return.
5. Re-running with a new slider value re-runs ONLY value detection + narrative against cached model
   probabilities when available (cheap), not the full pipeline.

DoD:
- End-to-end: fixture → choose risk → report in the UI, in both EN and ES.
- Moving the slider and re-analyzing visibly changes recommendations; the page states the risk used.
- Slider is keyboard-operable and screen-reader labeled.
```

---

## Phase 15 — Prediction History

```
GOAL: Persisted, retrievable, immutable history with post-match outcome settlement.

TASKS:
1. GET /predictions?mine (cursor pagination, filters: competition, market, risk bucket, date).
   FE history list + filters; re-open any past immutable report.
2. Settlement job: after a match finishes, fetch authoritative result and tag each
   PredictionResult/Recommendation as won/lost/void (FOR RECORD ONLY — not a "win rate" hype metric).
3. Show outcomes soberly; expose calibration/CLV at the aggregate level (admin/analyst), not as a
   marketing number to end users.

DoD:
- Past reports retrievable and unchanged (immutability test).
- Settlement labels come from authoritative results; voids handled.
```

---

## Phase 16 — Admin Panel

```
GOAL: Operations and model governance behind admin RBAC.

TASKS:
1. Admin routes (RBAC: admin): data-source health grid (status/latency/lastSync/staleness),
   POST /admin/data-sync trigger, user/role management, model versions + backtest metrics view,
   audit-log browser.
2. Bull Board mounted under admin guard.
3. FE admin screens, i18n'd, with permission-aware navigation.

DoD:
- Non-admin is denied every admin route (authz test).
- Admin can trigger a sync and see model/backtest metrics + audit entries.
```

---

## Phase 17 — Backtesting & Testing Strategy Implementation

```
GOAL: Backtesting engine + the full test pyramid wired as CI gates.

TASKS:
1. backtesting module: replay historical fixtures through the models; compute ROI (flat +
   conservative-Kelly), hit rate, calibration (Brier/log-loss/reliability), and Closing Line Value.
   Backtest across risk buckets to validate the RiskProfile mapping.
2. Regression guard: a model/feature change that worsens CLV or calibration FAILS CI.
3. Complete the pyramid: domain unit (>90%), use-case (fakes), repo (Testcontainers), provider
   contract + schema-drift, prediction golden/property, integration (api), FE component + a11y,
   Playwright e2e for the critical journey (register+age → search → set risk → report → history),
   security (authz/rate-limit), data-normalization tests.
4. Coverage thresholds + Nx boundary check as required CI status.

DoD:
- Backtest produces ROI/CLV/calibration on a sample; regression guard demonstrably blocks a bad model.
- CI fails on red tests, coverage miss, or boundary violation.
```

---

## Phase 18 — Security Hardening & Compliance

```
GOAL: Production-grade security + gambling compliance review.

TASKS:
1. Rate limiting (per-IP + per-user, stricter on auth + /predictions), brute-force lockout +
   captcha, CORS allow-list, Helmet/CSP, request size limits, idempotency keys on mutations.
2. Secrets to a vault; provider keys rotated, scoped, usage-budgeted. Optional MFA (TOTP).
3. CI security: SAST, SCA (dependency scan), secret scanning; scheduled DAST; fix findings.
4. Compliance pass: age/geo gating, responsible-gambling pages + self-exclusion, T&C/privacy,
   legal disclaimers ("not financial advice", "no guaranteed results"), audit coverage.
   Legal review checkpoint BEFORE launch.

DoD:
- ASVS L2 checklist satisfied; scans clean or risk-accepted with justification.
- No guaranteed-win copy anywhere; age gate + RG tooling verified; disclaimers present in EN/ES.
```

---

## Phase 19 — Deployment & Observability

```
GOAL: Ship to staging then production with observability, backups, and DR.

TASKS:
1. Docker Compose for local (postgres, redis, api, worker, web, adminer, bull-board).
2. IaC (Terraform) for staging + prod; immutable images tagged by SHA; promote-by-tag CD via
   GitHub Actions; reversible, gated Prisma migrations; feature flags via libs/config.
3. Observability: pino JSON logs + correlation ids, Prometheus/OTel metrics (API RED, queue
   depth/latency, model-quality dashboards: calibration/ROI/CLV), distributed tracing, Sentry
   error monitoring, uptime checks, alerting.
4. Backups: Postgres PITR + restore drill; object-storage versioning; documented RPO/RTO;
   runbooks for provider outage + model rollback (champion/challenger).

DoD:
- One-command local boot works.
- Promote-by-tag deploys to staging; dashboards + alerts live; a restore drill succeeds.
```

---

## Phase 20 — Future Roadmap (gated by evidence)

```
GOAL: Evolve only on backtest/CLV evidence, never hype.

TASKS (each its own later phase, prioritized by evidence):
1. ML models: gradient boosting / calibrated ensembles in a Python model-service (FastAPI) behind
   PredictionModelPort; automated retraining + drift detection.
2. More markets (player props, HT/FT, Asian depth), more leagues, multi-bookmaker aggregation +
   best-line + per-user CLV dashboards.
3. GraphQL gateway over the same libs/contracts; React Native mobile reusing ui patterns.
4. Personalization: saved risk profiles per user, bankroll-aware (still conservative) staking,
   watchlist intelligence, more locales beyond EN/ES.
5. Transparency: public methodology + model cards + user-facing calibration dashboards.

DoD (per item): the new model/feature beats the current baseline on out-of-sample CLV BEFORE promotion.
DO NOT: ship a model that only wins by overfitting; gate every promotion on backtest evidence.
```

---

## Appendix — Suggested execution order & parallelization

- **Strictly sequential:** 1 → 2 → 3 → 4 → 5 (foundations).
- **Then:** 6 → 7 → 8 → 9 → 10 → 11 → 12 (the data→prediction→value→report spine).
- **Parallelizable once contracts exist (after Phase 6/11):** Frontend phases 13 → 14 can begin against `libs/contracts` while backend phases continue, using fake data until real endpoints land.
- **Hardening tail:** 15 → 16 → 17 → 18 → 19, then 20 ongoing.
- **Cross-cutting (do not defer):** i18n (Feature Spec A) lands in Phases 2 + 13 and is honored in every phase; Risk Appetite (Feature Spec B) lands in Phase 11 + 14 and is reflected in 12/15.

## Appendix — Per-phase commit checklist

```
[ ] lint + typecheck + affected tests green (paste output)
[ ] Nx boundaries respected (no new violations)
[ ] new user-facing strings keyed in EN + ES
[ ] no guaranteed-win language; RG warnings intact where relevant
[ ] DoD bullets all satisfied
[ ] docs/ updated if architecture or contracts changed
```

> **End of Implementation Prompts.** Run Phase 1 next. Ask for Spanish-translated versions of any prompt, or a deeper sub-prompt breakdown of any single phase, on request.




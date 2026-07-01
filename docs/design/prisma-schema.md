# BetVision AI — Prisma Schema Design

> **Scope:** Implementation-ready data-model design for the canonical PostgreSQL store
> (SPEC §9 Data Model + Feature Spec B Risk Appetite + Phase 4 Database & Prisma).
> **Target location:** `libs/infrastructure/prisma/schema.prisma` (+ seed in `libs/infrastructure/prisma/seed.ts`).
> **Status:** Design doc. No code is scaffolded here; this is the spec to paste/adapt.

---

## 0. Design summary & key decisions

- **All 23 SPEC §9 entities are modeled**, plus two supporting entities the SPEC references but doesn't enumerate: `Weather` (`Match.weatherId?`) and is otherwise self-contained. `Lineup`/`Injury` are intentionally **out of scope for v1 persistence** and represented via provider payloads + computed features (kept as a note, not a table) to match the SPEC's explicit entity list.
- **IDs:** `cuid()` strings everywhere — collision-resistant, URL-safe, monotonic-ish for index locality, and friendlier than UUID v4 for B-tree clustering. (Swap to `uuid()` if you prefer; both are supported.)
- **Money / probabilities / odds use `Decimal`** (not `Float`) for reproducibility — probabilities are part of the "byte-identical reproducibility" guarantee in Feature Spec B, and float drift would break `inputSnapshotHash` comparisons. Aggregated descriptive stats (rolling averages) use `Float` since they are recomputed and not hashed.
- **Provenance is first-class:** provider-sourced rows carry `externalIds Json`, `sourceId` (FK → `DataSource`), and `fetchedAt`. Append-only fact tables never mutate; they are re-inserted and superseded.
- **Risk Appetite is stored on outputs, never on probabilities.** `Recommendation` and `AnalysisReport` store the `riskAppetite (0..100)` + resolved `RiskBucket`. `PredictionResult` stores the **objective** model numbers only; gating is computed per request. This structurally enforces "risk shapes selection, not truth."
- **`BettingMarket` is the market catalog** carrying `group` + `volatility`, the two columns Risk Appetite filters on. `OddsSnapshot`, `PredictionResult`, and `Recommendation` reference the catalog by `marketKey` for referential integrity while keeping `selection` free-form.
- **Index strategy** combines Prisma-native indexes (B-tree, composite, GIN-on-Json) with a **manual-SQL appendix** for what Prisma cannot express declaratively: `pg_trgm` trigram GIN indexes for name search, BRIN on time-series, declarative table **partitioning**, and a **materialized view** for hot `TeamStats` aggregates.

Tradeoffs called out inline and in §5/§7.

---

## 1. `schema.prisma`

```prisma
// =====================================================================
// BetVision AI — canonical data model
// Postgres + Prisma. Generated client consumed ONLY inside libs/infrastructure.
// =====================================================================

generator client {
  provider        = "prisma-client-js"
  // postgresqlExtensions  -> lets us declare pg_trgm so trigram GIN indexes
  //                          live in the schema instead of a hand-written migration.
  // fullTextSearchPostgres -> optional, if you later add tsvector search.
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  // Read replica for analytics/backtests (NFR §4) — wired via a second PrismaClient
  // (directUrl/replica handled at the client layer, not declaratively here).
  extensions = [pg_trgm]
}

// =====================================================================
// ENUMS
// =====================================================================

/// Canonical role names (SPEC §9 Role.name unique: user|analyst|admin).
enum RoleName {
  USER
  ANALYST
  ADMIN
}

enum UserStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  SELF_EXCLUDED // responsible-gambling self-exclusion (SPEC §8 RG screen)
  DELETED       // soft-delete tombstone for GDPR erasure
}

/// Bilingual support at launch (SPEC NFR i18n EN/ES).
enum Language {
  EN
  ES
}

enum CompetitionType {
  LEAGUE
  CUP
  UCL
  FRIENDLY
}

enum MatchStatus {
  SCHEDULED
  LIVE
  FINISHED
  POSTPONED
  CANCELLED
  ABANDONED
}

/// Market families. Risk Appetite gates by group
/// (conservative excludes CORRECT_SCORE / SCORERS).
enum MarketGroup {
  MATCH_RESULT  // 1X2, Double Chance, Draw No Bet
  HANDICAP      // Asian Handicap
  GOALS         // Over/Under, BTTS
  HALVES        // HT/FT
  CORNERS       // total / team corners
  CARDS         // total / team cards
  SCORERS       // anytime goalscorer
  CORRECT_SCORE // correct score (high risk)
}

/// Per-market variance band. Risk Appetite caps maxMarketVolatility.
enum MarketVolatility {
  LOW
  MEDIUM
  HIGH
}

/// Calibrated confidence band attached to each prediction result.
enum ConfidenceLevel {
  LOW
  MEDIUM
  HIGH
}

/// Risk band attached to each prediction result / recommendation.
enum RiskLevel {
  LOW
  MEDIUM
  HIGH
}

/// Resolved Risk Appetite bucket (Feature Spec B: 0–33 / 34–66 / 67–100).
enum RiskBucket {
  CONSERVATIVE
  BALANCED
  AGGRESSIVE
}

enum SubscriptionTier {
  FREE
  BASIC
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  INCOMPLETE
  EXPIRED
}

/// Provider/connector kind (registry in SPEC §15).
enum DataSourceType {
  SPORTS_DATA
  ODDS
  WEATHER
  INJURY
  LINEUP
  REFEREE
  LLM
}

enum DataSourceStatus {
  HEALTHY
  DEGRADED
  DOWN
  DISABLED
}

/// Scope of a TeamStats rolling aggregate.
enum StatVenue {
  HOME
  AWAY
  ALL
}

/// Watchlist target discriminator (exactly one target FK set).
enum WatchlistTargetType {
  TEAM
  MATCH
  COMPETITION
}

// =====================================================================
// IDENTITY / ACCESS
// =====================================================================

model Role {
  id          String   @id @default(cuid())
  name        RoleName @unique
  permissions String[] // permission keys, e.g. ["match:read","admin:datasource:write"]
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("roles")
}

model User {
  id              String     @id @default(cuid())
  email           String     @unique
  passwordHash    String
  roleId          String
  role            Role       @relation(fields: [roleId], references: [id], onDelete: Restrict)
  locale          Language   @default(EN) // SPEC: User.locale default 'en' (seeded from DEFAULT_LOCALE)
  status          UserStatus @default(PENDING_VERIFICATION)
  ageConfirmedAt  DateTime?  // compliance gate (FR-12); null = not yet confirmed
  // Responsible-gambling self-limits (SPEC §8). Null = no self-limit set.
  selfLimitJson   Json?
  selfExcludedAt  DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  deletedAt       DateTime?  // GDPR soft delete

  subscription    Subscription?
  watchlist       UserWatchlist[]
  predictions     Prediction[]   @relation("RequestedPredictions")
  auditLogs       AuditLog[]     @relation("ActorAudit")

  @@index([roleId])
  @@index([status])
  @@map("users")
}

model Subscription {
  id              String             @id @default(cuid())
  userId          String             @unique // 1:1 with User
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  tier            SubscriptionTier   @default(FREE)
  status          SubscriptionStatus @default(TRIALING)
  currentPeriodEnd DateTime?
  providerRef     String?            // Stripe/Paddle subscription id
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([status])
  @@index([currentPeriodEnd])
  @@map("subscriptions")
}

model UserWatchlist {
  id            String              @id @default(cuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetType    WatchlistTargetType
  teamId        String?
  team          Team?               @relation(fields: [teamId], references: [id], onDelete: Cascade)
  matchId       String?
  match         Match?              @relation(fields: [matchId], references: [id], onDelete: Cascade)
  competitionId String?
  competition   Competition?        @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  createdAt     DateTime            @default(now())

  // Dedupe: a user cannot watch the same target twice. Partial-unique handling
  // (NULLs) is enforced via the manual SQL appendix unique indexes.
  @@index([userId])
  @@index([teamId])
  @@index([matchId])
  @@index([competitionId])
  @@map("user_watchlists")
}

// =====================================================================
// FOOTBALL MASTER DATA
// =====================================================================

model Team {
  id          String   @id @default(cuid())
  externalIds Json     @default("{}") // { "apifootball": 541, "opta": "t123" }
  name        String
  shortName   String?
  country     String?
  crestUrl    String?
  eloRating   Float?   // computed/updated by jobs (FR-4); nullable until first rating
  // provenance
  sourceId    String?
  source      DataSource? @relation("TeamSource", fields: [sourceId], references: [id])
  fetchedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  players     Player[]
  homeMatches Match[]  @relation("HomeTeam")
  awayMatches Match[]  @relation("AwayTeam")
  teamStats   TeamStats[]
  watchlists  UserWatchlist[]

  // externalIds GIN -> Prisma-native (jsonb). name trigram -> manual SQL appendix.
  @@index([externalIds], type: Gin)
  @@index([name])
  @@index([country])
  @@map("teams")
}

model Player {
  id          String    @id @default(cuid())
  externalIds Json      @default("{}")
  teamId      String?
  team        Team?     @relation(fields: [teamId], references: [id], onDelete: SetNull)
  name        String
  position    String?   // GK/DEF/MID/FWD or detailed; free-form to avoid over-constraining
  dob         DateTime?
  nationality String?
  // provenance
  sourceId    String?
  source      DataSource? @relation("PlayerSource", fields: [sourceId], references: [id])
  fetchedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  playerStats PlayerStats[]

  @@index([externalIds], type: Gin)
  @@index([teamId])
  @@index([name]) // trigram variant added in manual SQL appendix
  @@map("players")
}

model Competition {
  id          String          @id @default(cuid())
  externalIds Json            @default("{}")
  name        String
  country     String?
  type        CompetitionType @default(LEAGUE)
  tier        Int?            // 1 = top flight
  sourceId    String?
  source      DataSource?     @relation("CompetitionSource", fields: [sourceId], references: [id])
  fetchedAt   DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  seasons     Season[]
  matches     Match[]
  watchlists  UserWatchlist[]

  @@index([externalIds], type: Gin)
  @@index([name])
  @@index([country, type])
  @@map("competitions")
}

model Season {
  id            String      @id @default(cuid())
  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  label         String      // e.g. "2025/26"
  startDate     DateTime?
  endDate       DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  matches       Match[]
  teamStats     TeamStats[]
  playerStats   PlayerStats[]
  refereeStats  RefereeStats[]

  @@unique([competitionId, label])
  @@index([competitionId])
  @@map("seasons")
}

model Match {
  id            String      @id @default(cuid())
  externalIds   Json        @default("{}")
  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id], onDelete: Restrict)
  seasonId      String
  season        Season      @relation(fields: [seasonId], references: [id], onDelete: Restrict)
  homeTeamId    String
  homeTeam      Team        @relation("HomeTeam", fields: [homeTeamId], references: [id], onDelete: Restrict)
  awayTeamId    String
  awayTeam      Team        @relation("AwayTeam", fields: [awayTeamId], references: [id], onDelete: Restrict)
  refereeId     String?
  referee       Referee?    @relation(fields: [refereeId], references: [id], onDelete: SetNull)
  kickoffUtc    DateTime
  venue         String?
  status        MatchStatus @default(SCHEDULED)
  round         String?
  importance    Float?      // strength-of-schedule / fixture importance weight
  weatherId     String?     @unique
  weather       Weather?    @relation(fields: [weatherId], references: [id], onDelete: SetNull)
  // provenance
  sourceId      String?
  source        DataSource? @relation("MatchSource", fields: [sourceId], references: [id])
  fetchedAt     DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  matchStats    MatchStats?
  oddsSnapshots OddsSnapshot[]
  predictions   Prediction[]
  reports       AnalysisReport[]
  watchlists    UserWatchlist[]

  @@index([kickoffUtc])
  @@index([homeTeamId, awayTeamId])
  @@index([seasonId])
  @@index([competitionId])
  @@index([status])
  @@index([externalIds], type: Gin)
  @@map("matches")
}

/// Optional weather snapshot attached to a Match (Match.weatherId? in SPEC §9).
model Weather {
  id            String   @id @default(cuid())
  temperatureC  Float?
  conditions    String?  // "clear" | "rain" | ...
  windKph       Float?
  humidityPct   Float?
  precipitationMm Float?
  capturedAt    DateTime @default(now())
  sourceId      String?
  source        DataSource? @relation("WeatherSource", fields: [sourceId], references: [id])
  fetchedAt     DateTime?

  match         Match?

  @@map("weather")
}

// =====================================================================
// FACTS & AGGREGATES (append-only / computed)
// =====================================================================

/// Per-match historical fact table. Append-only; one row per finished match.
model MatchStats {
  id              String  @id @default(cuid())
  matchId         String  @unique
  match           Match   @relation(fields: [matchId], references: [id], onDelete: Cascade)
  homeGoals       Int?
  awayGoals       Int?
  homeXg          Decimal? @db.Decimal(6, 3)
  awayXg          Decimal? @db.Decimal(6, 3)
  homeCorners     Int?
  awayCorners     Int?
  homeYellow      Int?
  awayYellow      Int?
  homeRed         Int?
  awayRed         Int?
  homeShots       Int?
  awayShots       Int?
  homeShotsOnTarget Int?
  awayShotsOnTarget Int?
  homePossession  Decimal? @db.Decimal(5, 2)
  awayPossession  Decimal? @db.Decimal(5, 2)
  homeFouls       Int?
  awayFouls       Int?
  // provenance + raw payload reference (S3 key + hash for idempotent ingestion)
  rawPayloadHash  String?
  sourceId        String?
  source          DataSource? @relation("MatchStatsSource", fields: [sourceId], references: [id])
  fetchedAt       DateTime?
  createdAt       DateTime @default(now())

  @@index([matchId])
  @@map("match_stats")
}

/// Rolling/aggregated per-team-per-scope stats. Computed & versioned by jobs.
/// Prefer reading these precomputed rows over aggregating on the fly (§5).
model TeamStats {
  id              String    @id @default(cuid())
  teamId          String
  team            Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  venue           StatVenue @default(ALL)
  window          Int       @default(5) // rolling window size (e.g. last N matches)
  featureVersion  String    @default("v1") // recompute key; bump invalidates cache
  avgGoalsFor     Float?
  avgGoalsAgainst Float?
  avgXgFor        Float?
  avgXgAgainst    Float?
  avgCornersFor   Float?
  avgCornersAgainst Float?
  avgCardsFor     Float?
  avgCardsAgainst Float?
  cleanSheets     Int?
  form            String?   // e.g. "WWDLW"
  computedAt      DateTime  @default(now())

  @@unique([teamId, seasonId, venue, window, featureVersion])
  @@index([teamId, seasonId, venue, window])
  @@map("team_stats")
}

model PlayerStats {
  id              String   @id @default(cuid())
  playerId        String
  player          Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  seasonId        String
  season          Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  apps            Int?
  minutes         Int?
  goals           Int?
  assists         Int?
  xg              Decimal? @db.Decimal(6, 3)
  xa              Decimal? @db.Decimal(6, 3)
  keyPasses       Int?
  yellow          Int?
  red             Int?
  computedAt      DateTime @default(now())

  @@unique([playerId, seasonId])
  @@index([playerId, seasonId])
  @@map("player_stats")
}

model Referee {
  id          String   @id @default(cuid())
  externalIds Json     @default("{}")
  name        String
  country     String?
  sourceId    String?
  source      DataSource? @relation("RefereeSource", fields: [sourceId], references: [id])
  fetchedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  matches      Match[]
  refereeStats RefereeStats[]

  @@index([externalIds], type: Gin)
  @@index([name]) // trigram variant in manual SQL appendix
  @@map("referees")
}

model RefereeStats {
  id           String   @id @default(cuid())
  refereeId    String
  referee      Referee  @relation(fields: [refereeId], references: [id], onDelete: Cascade)
  seasonId     String
  season       Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  matches      Int?
  avgYellow    Float?
  avgRed       Float?
  avgFouls     Float?
  avgPenalties Float?
  homeBias     Float?   // optional tendency metric
  computedAt   DateTime @default(now())

  @@unique([refereeId, seasonId])
  @@index([refereeId, seasonId])
  @@map("referee_stats")
}

// =====================================================================
// ODDS (time-series, append-only)
// =====================================================================

/// Append-only odds time-series. Backbone of CLV + line-movement analysis.
/// HOT table -> partition by capturedAt (see §6 + SQL appendix).
model OddsSnapshot {
  id         String         @id @default(cuid())
  matchId    String
  match      Match          @relation(fields: [matchId], references: [id], onDelete: Cascade)
  bookmaker  String
  marketKey  String         // FK into BettingMarket.key
  market     BettingMarket  @relation(fields: [marketKey], references: [key], onDelete: Restrict)
  selection  String         // "HOME" | "OVER_2_5" | "1-0" | playerId ...
  price      Decimal        @db.Decimal(10, 4) // decimal odds, > 1.0
  capturedAt DateTime       @default(now())
  // provenance
  sourceId   String?
  source     DataSource?    @relation("OddsSource", fields: [sourceId], references: [id])
  fetchedAt  DateTime?

  // Primary query path: latest price per (match, market, selection) over time.
  @@index([matchId, marketKey, selection, capturedAt])
  @@index([capturedAt]) // BRIN variant recommended at scale (SQL appendix)
  @@index([bookmaker])
  @@map("odds_snapshots")
}

/// Reference catalog of supported markets. Carries the group + volatility
/// columns Risk Appetite filters by (Feature Spec B). Near-static; seeded.
model BettingMarket {
  id           String           @id @default(cuid())
  key          String           @unique // e.g. "1X2", "OU_2_5", "BTTS", "CS"
  name         String
  group        MarketGroup
  volatility   MarketVolatility
  riskBaseline Float            @default(0.5) // base risk weight, tuned by backtests
  description  String?
  enabled      Boolean          @default(true)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  oddsSnapshots      OddsSnapshot[]
  predictionResults  PredictionResult[]
  recommendations    Recommendation[]

  @@index([group])
  @@index([volatility])
  @@map("betting_markets")
}

// =====================================================================
// PREDICTIONS / VALUE / REPORTS
// =====================================================================

/// Immutable prediction run for a match by a model version.
model Prediction {
  id               String   @id @default(cuid())
  matchId          String
  match            Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  modelVersion     String   // e.g. "ensemble-2026.01"
  inputSnapshotHash String  // hash of the feature vector -> reproducibility (NFR §4)
  requestedById    String?
  requestedBy      User?    @relation("RequestedPredictions", fields: [requestedById], references: [id], onDelete: SetNull)
  createdAt        DateTime @default(now())

  input            PredictionInput?
  results          PredictionResult[]
  recommendations  Recommendation[]
  reports          AnalysisReport[]

  @@index([matchId])
  @@index([modelVersion])
  @@index([inputSnapshotHash])
  @@index([requestedById])
  @@map("predictions")
}

/// Exact feature vector used for a prediction (1:1). Reproducibility.
model PredictionInput {
  id           String     @id @default(cuid())
  predictionId String     @unique
  prediction   Prediction @relation(fields: [predictionId], references: [id], onDelete: Cascade)
  featuresJson Json       // the exact engineered feature vector
  featureVersion String   @default("v1")
  createdAt    DateTime   @default(now())

  @@map("prediction_inputs")
}

/// One row per market/selection produced by a prediction. OBJECTIVE numbers only.
/// Risk gating is computed per request and NOT stored here (Feature Spec B).
model PredictionResult {
  id                 String          @id @default(cuid())
  predictionId       String
  prediction         Prediction      @relation(fields: [predictionId], references: [id], onDelete: Cascade)
  marketKey          String
  market             BettingMarket   @relation(fields: [marketKey], references: [key], onDelete: Restrict)
  selection          String
  modelProbability   Decimal         @db.Decimal(6, 5) // calibrated, 0..1
  impliedProbability Decimal?        @db.Decimal(6, 5)
  edge               Decimal?        @db.Decimal(7, 5) // modelProb - impliedProb
  expectedValue      Decimal?        @db.Decimal(10, 5)
  suggestedStakePct  Decimal?        @db.Decimal(6, 4) // fractional-Kelly-derived, conservative
  confidence         ConfidenceLevel
  risk               RiskLevel
  createdAt          DateTime        @default(now())

  @@unique([predictionId, marketKey, selection])
  @@index([predictionId, marketKey])
  @@map("prediction_results")
}

/// Derived recommendation (a result that passed the Risk Appetite profile).
/// Stores the riskAppetite + resolved bucket used, so it reproduces exactly.
model Recommendation {
  id            String          @id @default(cuid())
  predictionId  String
  prediction    Prediction      @relation(fields: [predictionId], references: [id], onDelete: Cascade)
  marketKey     String
  market        BettingMarket   @relation(fields: [marketKey], references: [key], onDelete: Restrict)
  selection     String
  rationale     String          @db.Text
  confidence    ConfidenceLevel
  risk          RiskLevel
  isBestBet     Boolean         @default(false)
  // Risk Appetite provenance (Feature Spec B)
  riskAppetite  Int             // 0..100 slider value used
  riskBucket    RiskBucket      // resolved bucket
  createdAt     DateTime        @default(now())

  @@index([predictionId])
  @@index([predictionId, isBestBet])
  @@index([riskBucket])
  @@map("recommendations")
}

/// Immutable, cacheable analysis report. Bilingual. Stores the risk context.
model AnalysisReport {
  id            String     @id @default(cuid())
  matchId       String
  match         Match      @relation(fields: [matchId], references: [id], onDelete: Cascade)
  predictionId  String
  prediction    Prediction @relation(fields: [predictionId], references: [id], onDelete: Cascade)
  language      Language   // EN | ES
  contentJson   Json       // structured report sections
  narrative     String     @db.Text
  sources       Json       @default("[]") // [{title,url,provider}] cited sources
  // Risk Appetite provenance (Feature Spec B)
  riskAppetite  Int        // 0..100 used to produce the recommendations
  riskBucket    RiskBucket
  createdAt     DateTime   @default(now())

  @@index([matchId])
  @@index([predictionId])
  @@index([language])
  @@map("analysis_reports")
}

// =====================================================================
// OPS / GOVERNANCE
// =====================================================================

/// Provider registry + health (SPEC §15, admin §8). Referenced as provenance.
model DataSource {
  id         String           @id @default(cuid())
  name       String           @unique
  type       DataSourceType
  status     DataSourceStatus @default(HEALTHY)
  lastSyncAt DateTime?
  latencyMs  Int?
  errorRate  Float?           // 0..1 rolling error rate
  configRef  String?          // vault/secret reference, not the secret itself
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  // Reverse provenance relations (named to disambiguate multiple FKs)
  teams        Team[]         @relation("TeamSource")
  players      Player[]       @relation("PlayerSource")
  competitions Competition[]  @relation("CompetitionSource")
  matches      Match[]        @relation("MatchSource")
  matchStats   MatchStats[]   @relation("MatchStatsSource")
  referees     Referee[]      @relation("RefereeSource")
  oddsSnapshots OddsSnapshot[] @relation("OddsSource")
  weather      Weather[]      @relation("WeatherSource")

  @@index([type, status])
  @@map("data_sources")
}

/// Append-only audit trail (SPEC §9). Partition by createdAt at scale (§6).
model AuditLog {
  id           String   @id @default(cuid())
  actorId      String?
  actor        User?    @relation("ActorAudit", fields: [actorId], references: [id], onDelete: SetNull)
  action       String   // "user.login" | "datasource.sync" | ...
  entity       String   // entity type name
  entityId     String?
  metadataJson Json     @default("{}")
  createdAt    DateTime @default(now())

  @@index([entity, entityId])
  @@index([actorId, createdAt])
  @@index([createdAt])
  @@map("audit_logs")
}
```

> **Note — entities intentionally not tabled:** SPEC §9 lists exactly the 23 entities above.
> Lineups, injuries, and suspensions are ingested as provider payloads and folded into the
> engineered feature vector (`PredictionInput.featuresJson`) rather than persisted as first-class
> tables in v1. If they graduate to first-class entities, add `MatchLineup` / `PlayerAvailability`
> with the same provenance triplet (`externalIds`, `sourceId`, `fetchedAt`).

---

## 2. Coverage matrix (SPEC §9 → schema)

| SPEC §9 entity | Model | Notable spec'd fields covered |
|---|---|---|
| User | `User` | email unique, passwordHash, roleId, **locale (default EN)**, status, **ageConfirmedAt** |
| Role | `Role` | name unique (RoleName enum), permissions[] |
| Team | `Team` | externalIds(jsonb,GIN), name(trigram), country, crestUrl, eloRating |
| Player | `Player` | externalIds, teamId, name(trigram), position, dob |
| Competition | `Competition` | externalIds, name, country, type(enum), tier |
| Season | `Season` | competitionId, label, startDate, endDate |
| Match | `Match` | externalIds, comp/season/home/away, **kickoffUtc idx**, venue, status, round, importance, weatherId? |
| MatchStats | `MatchStats` | matchId unique, goals/xg/corners/cards/shots/possession/fouls |
| TeamStats | `TeamStats` | teamId/seasonId/venue/window composite, avg*, cleanSheets, form |
| PlayerStats | `PlayerStats` | playerId/seasonId, apps/minutes/goals/assists/xg/xa/keyPasses/cards |
| Referee | `Referee` | externalIds, name, country |
| RefereeStats | `RefereeStats` | refereeId/seasonId, avgYellow/Red/Fouls/Penalties, matches, homeBias |
| OddsSnapshot | `OddsSnapshot` | matchId, bookmaker, market, selection, price, **capturedAt** (append-only) |
| BettingMarket | `BettingMarket` | key, name, **group**, **volatility**, riskBaseline |
| Prediction | `Prediction` | matchId, **modelVersion**, **inputSnapshotHash**, requestedBy |
| PredictionInput | `PredictionInput` | predictionId, **featuresJson** |
| PredictionResult | `PredictionResult` | market/selection/modelProb/impliedProb/edge/EV/stake/confidence/risk |
| Recommendation | `Recommendation` | market/selection/rationale/confidence/risk/isBestBet + **riskAppetite/riskBucket** |
| DataSource | `DataSource` | name, type, status, lastSyncAt, latencyMs, errorRate, configRef |
| AnalysisReport | `AnalysisReport` | matchId/predictionId, **language**, contentJson, narrative, sources[] + **riskAppetite/bucket** |
| AuditLog | `AuditLog` | actorId, action, entity, entityId, metadataJson, createdAt |
| Subscription | `Subscription` | userId unique, tier, status, currentPeriodEnd, providerRef |
| UserWatchlist | `UserWatchlist` | userId, teamId?/matchId?/competitionId?, createdAt |

---

## 3. Index strategy

### 3.1 Prisma-native indexes (already in schema)
- **GIN on `externalIds` jsonb**: `Team`, `Player`, `Competition`, `Match`, `Referee` — fast `externalIds @> '{...}'` provider-id lookups and dedupe (FR-3/FR-4).
- **`Match.kickoffUtc`** B-tree — fixture listings, upcoming/by-date queries.
- **`Match (homeTeamId, awayTeamId)`** — head-to-head lookups (FR-4).
- **`OddsSnapshot (matchId, marketKey, selection, capturedAt)`** — the line-movement / latest-price access path (CLV).
- **Composite uniques** for idempotency: `TeamStats(teamId,seasonId,venue,window,featureVersion)`, `PlayerStats(playerId,seasonId)`, `RefereeStats(refereeId,seasonId)`, `PredictionResult(predictionId,marketKey,selection)`, `Season(competitionId,label)`.
- **Catalog filters** for Risk Appetite: `BettingMarket(group)`, `BettingMarket(volatility)`.

### 3.2 What Prisma cannot express → manual SQL (see Appendix A)
- **Trigram name search** (`pg_trgm` + `GIN ... gin_trgm_ops`) for `Team.name`, `Player.name`, `Competition.name`, `Referee.name`. *(With the `postgresqlExtensions` preview feature you may instead declare them inline as `@@index([name(ops: raw("gin_trgm_ops"))], type: Gin)`; the appendix is the portable fallback and documents the extension requirement.)*
- **BRIN** index on `OddsSnapshot.capturedAt` / `AuditLog.createdAt` — far smaller than B-tree on always-appended timestamps.
- **Declarative partitioning** (Postgres native range partitioning) — not modelable in Prisma.
- **Partial-unique watchlist indexes** with `WHERE <col> IS NOT NULL`.
- **Materialized view** for hot `TeamStats` "current form" aggregates.

---

## 4. Enums delivered (checklist)

| Requested enum | Schema enum |
|---|---|
| Role names | `RoleName` |
| MarketGroup | `MarketGroup` |
| MarketVolatility | `MarketVolatility` |
| ConfidenceLevel | `ConfidenceLevel` |
| RiskLevel | `RiskLevel` |
| RiskBucket | `RiskBucket` |
| Language | `Language` |
| MatchStatus | `MatchStatus` |
| CompetitionType | `CompetitionType` |
| SubscriptionTier / Status | `SubscriptionTier`, `SubscriptionStatus` |
| DataSourceStatus | `DataSourceStatus` |

Plus supporting enums: `UserStatus`, `DataSourceType`, `StatVenue`, `WatchlistTargetType`.

---

## 5. Scalability notes

- **Separate hot transactional vs append-only time-series.** `User`, `Subscription`, `Role`, catalog tables stay small and OLTP-tuned. `OddsSnapshot`, `MatchStats`, `AuditLog` are append-only and grow unbounded — isolate their IO and index them for time-range scans (BRIN), not point updates.
- **Partition large fact tables by time/season** (see §6): `OddsSnapshot` by `capturedAt` (monthly RANGE), `AuditLog` by `createdAt` (monthly RANGE), `MatchStats` by season (LIST/RANGE on a season key). Partition pruning keeps scans bounded; old partitions can be detached/archived to object storage cheaply.
- **Precompute aggregates, don't aggregate on read.** `TeamStats`/`PlayerStats`/`RefereeStats` are job-computed and versioned (`featureVersion`). For the hottest "current form" read path, back it with a **materialized view** (Appendix A) refreshed `CONCURRENTLY` after each ingestion batch.
- **Read replicas for analytics/backtests.** Backtesting (FR-11) replays large history and must not contend with the request path. Route the analytics `PrismaClient` to a replica; keep writes on primary. Reports are immutable once generated, so replica reads are safe.
- **Caching layer.** Resolved fixtures, computed feature vectors, and hot `AnalysisReport`s are cached in Redis (NFR < 800 ms p95 cached report); the DB is the system of record, Redis the accelerator.
- **JSON discipline.** `externalIds`/`featuresJson`/`contentJson` are `jsonb` (Prisma `Json`). GIN-index only where queried (`externalIds`); large free-form payloads (`featuresJson`, `contentJson`) are stored but not indexed. Very large raw provider payloads live in **object storage**, referenced by `rawPayloadHash`/`configRef`, not inline.
- **Decimal for hashed values.** Because `inputSnapshotHash` reproducibility depends on stable numeric serialization, probabilities/odds/edge/EV/stake use `Decimal` to avoid float non-determinism across platforms.

---

## 6. Partitioning candidates (summary)

| Table | Strategy | Key | Rationale |
|---|---|---|---|
| `odds_snapshots` | RANGE (monthly) | `capturedAt` | Highest write volume; queried by time window; old data archivable. |
| `audit_logs` | RANGE (monthly) | `createdAt` | Append-only, retention-governed; prune by dropping partitions. |
| `match_stats` | RANGE/LIST (per season) | season-derived | Large historical fact table; season-scoped reads. |

> Prisma manages partitioned tables as a single logical table; **create the partitioned parent + child partitions via raw SQL migration** (Appendix A). Prisma's `migrate` will treat the table as-is for CRUD. Keep the `@id` and partition key consistent (Postgres requires the partition key to be part of the primary key — see Appendix note).

---

## Appendix A — Manual migration SQL

These run as a **raw SQL migration** (`prisma migrate dev --create-only`, then edit the generated `migration.sql`, then `prisma migrate dev`). Items marked *(preview-replaceable)* can instead be declared in `schema.prisma` once the `postgresqlExtensions` preview feature is enabled.

```sql
-- 1) Trigram extension for fuzzy name search ----------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Trigram GIN indexes for name search  (preview-replaceable) ---------------
CREATE INDEX IF NOT EXISTS teams_name_trgm_idx
  ON teams USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS players_name_trgm_idx
  ON players USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS competitions_name_trgm_idx
  ON competitions USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS referees_name_trgm_idx
  ON referees USING gin (name gin_trgm_ops);

-- 3) BRIN indexes on append-only timestamps (smaller than B-tree at scale) ----
--    Drop the corresponding B-tree @@index in schema once BRIN is in place,
--    or keep B-tree for small deployments and switch to BRIN at volume.
CREATE INDEX IF NOT EXISTS odds_snapshots_captured_brin
  ON odds_snapshots USING brin (captured_at);
CREATE INDEX IF NOT EXISTS audit_logs_created_brin
  ON audit_logs USING brin (created_at);

-- 4) Partial-unique watchlist constraints (NULL-safe dedupe) ------------------
CREATE UNIQUE INDEX IF NOT EXISTS uniq_watch_user_team
  ON user_watchlists (user_id, team_id) WHERE team_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_watch_user_match
  ON user_watchlists (user_id, match_id) WHERE match_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_watch_user_competition
  ON user_watchlists (user_id, competition_id) WHERE competition_id IS NOT NULL;
-- Enforce "exactly one target":
ALTER TABLE user_watchlists ADD CONSTRAINT watch_one_target CHECK (
  (CASE WHEN team_id        IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN match_id       IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN competition_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- 5) Domain guards as CHECK constraints --------------------------------------
ALTER TABLE recommendations
  ADD CONSTRAINT rec_risk_appetite_range CHECK (risk_appetite BETWEEN 0 AND 100);
ALTER TABLE analysis_reports
  ADD CONSTRAINT report_risk_appetite_range CHECK (risk_appetite BETWEEN 0 AND 100);
ALTER TABLE odds_snapshots
  ADD CONSTRAINT odds_price_gt_one CHECK (price > 1.0);
ALTER TABLE prediction_results
  ADD CONSTRAINT pr_model_prob_unit CHECK (model_probability >= 0 AND model_probability <= 1);

-- 6) Declarative partitioning (OddsSnapshot example) -------------------------
--    NOTE: Postgres requires the partition key to be part of the PK.
--    => make the prediction id+capturedAt a composite PK on the partitioned
--       table, OR keep a surrogate id but PK on (id, captured_at).
--    This is done by converting the Prisma-created table; illustrative:
--
--    ALTER TABLE odds_snapshots RENAME TO odds_snapshots_legacy;
--    CREATE TABLE odds_snapshots (LIKE odds_snapshots_legacy INCLUDING ALL)
--      PARTITION BY RANGE (captured_at);
--    CREATE TABLE odds_snapshots_2026_06 PARTITION OF odds_snapshots
--      FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
--    -- repeat per month; automate creation with pg_partman.
--    INSERT INTO odds_snapshots SELECT * FROM odds_snapshots_legacy;
--    DROP TABLE odds_snapshots_legacy;
--
--    Apply the same pattern to audit_logs (by created_at) and
--    match_stats (by a season-derived key). Consider pg_partman or
--    a TimescaleDB hypertable for odds_snapshots at very large scale.

-- 7) Materialized view: current team form (hot read path) --------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_team_current_form AS
SELECT DISTINCT ON (team_id, season_id, venue)
       team_id, season_id, venue, window, avg_goals_for, avg_goals_against,
       avg_xg_for, avg_xg_against, form, computed_at
FROM team_stats
ORDER BY team_id, season_id, venue, computed_at DESC;
CREATE UNIQUE INDEX IF NOT EXISTS mv_team_current_form_uniq
  ON mv_team_current_form (team_id, season_id, venue);
-- Refresh after each ingestion/feature batch:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_current_form;
```

> **Prisma `migrate` & partitioning caveat:** Prisma does not author partitioned DDL. Either (a) keep these tables non-partitioned until volume warrants it and convert via the raw migration above, or (b) baseline the partitioned tables with `prisma db pull` after creating them manually so the schema stays in sync. Whichever you pick, document it in the migration history.

---

## Appendix B — Seed plan (`libs/infrastructure/prisma/seed.ts`)

Idempotent (`upsert` by natural key). Run on `prisma migrate dev`/`deploy` for dev/staging.

### B.1 Roles
```
upsert Role(name=USER,    permissions=["match:read","prediction:read","report:read","watchlist:write","subscription:read"])
upsert Role(name=ANALYST, permissions=USER + ["backtest:read","model:read","prediction:create"])
upsert Role(name=ADMIN,   permissions=["*"])  // or explicit admin:* set
```

### B.2 BettingMarket catalog (group + volatility per Phase-4 / Feature-Spec-B mapping)

| key | name | group | volatility |
|---|---|---|---|
| `1X2` | Match Result | MATCH_RESULT | LOW |
| `DC` | Double Chance | MATCH_RESULT | LOW |
| `DNB` | Draw No Bet | MATCH_RESULT | LOW |
| `AH` | Asian Handicap | HANDICAP | MEDIUM |
| `OU_0_5`…`OU_4_5` | Over/Under Goals (per line) | GOALS | LOW→MEDIUM* |
| `BTTS` | Both Teams To Score | GOALS | LOW |
| `HTFT` | Half-Time/Full-Time | HALVES | HIGH |
| `CORNERS_TOTAL` | Total Corners | CORNERS | MEDIUM |
| `CORNERS_TEAM` | Team Corners | CORNERS | MEDIUM |
| `CARDS_TOTAL` | Total Cards | CARDS | MEDIUM |
| `CARDS_TEAM` | Team Cards | CARDS | MEDIUM |
| `AGS` | Anytime Goalscorer | SCORERS | HIGH |
| `CS` | Correct Score | CORRECT_SCORE | HIGH |

\* Core `OU_2_5` seeds as `LOW`; far-from-central lines (`OU_0_5`, `OU_4_5`) seed as `MEDIUM`.
Mapping rule (per prompt): **1X2 / OU / BTTS = low–med; corners / cards = med; correct-score / anytime-scorer = high.**

```
for each row above: upsert BettingMarket by key { name, group, volatility, riskBaseline, enabled:true }
// riskBaseline suggested: LOW=0.25, MEDIUM=0.5, HIGH=0.8 (tuned later by backtests)
```

### B.3 Dev competitions & seasons
```
upsert Competition(name="Premier League", country="England", type=LEAGUE, tier=1)
upsert Competition(name="La Liga",        country="Spain",   type=LEAGUE, tier=1)
upsert Competition(name="UEFA Champions League", country=null, type=UCL, tier=1)
  -> for each: upsert Season(label="2025/26", startDate, endDate)
// Optionally seed a couple of Teams (Real Madrid, Barcelona) + a sample Match
// for the "Real Madrid vs Barcelona" demo fixture used across the SPEC.
```

### B.4 DataSource registry (dev placeholders)
```
upsert DataSource(name="api-football", type=SPORTS_DATA, status=HEALTHY, configRef="vault:apifootball")
upsert DataSource(name="odds-provider", type=ODDS,       status=HEALTHY, configRef="vault:odds")
upsert DataSource(name="weather-api",   type=WEATHER,    status=HEALTHY, configRef="vault:weather")
upsert DataSource(name="llm",           type=LLM,        status=HEALTHY, configRef="vault:llm")
```

**Seed idempotency:** every `upsert` keys on a unique column (`Role.name`, `BettingMarket.key`,
`Competition (name,country)` via a synthetic unique or `externalIds`, `Season (competitionId,label)`,
`DataSource.name`) so re-running the seed never duplicates rows (Phase-4 DoD: "seed run clean").

---

## Appendix C — Notes for the repository/adapter layer (Phase 4 DoD)

- **Do not leak Prisma types.** Repository adapters in `libs/infrastructure` map persistence rows ↔ domain entities/VOs; controllers and use cases never import `@prisma/client` types.
- **Risk gating is request-time.** `PredictionResult` rows are written once with objective numbers. `DetectValueBetsUseCase(riskAppetite)` reads them, resolves a `RiskProfile`, gates by `edge/confidence/marketVolatility/group`, sizes stake, and writes `Recommendation` rows that carry `riskAppetite` + `riskBucket`. Re-running at a new appetite re-derives recommendations from the **same** `PredictionResult` rows — model probabilities stay byte-identical.
- **Provenance writes.** Every ingestion job sets `externalIds`, `sourceId`, `fetchedAt` (+ `rawPayloadHash` where a raw payload exists) for idempotent dedupe by `externalIds @> '{...}'`.
- **Testcontainers.** Repository tests run against a real Postgres (`pg_trgm` enabled) so trigram/GIN paths and CHECK constraints are exercised, not mocked.


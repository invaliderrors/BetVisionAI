-- =====================================================================
-- Manual-SQL appendix (design doc Appendix A). Items Prisma cannot express
-- declaratively. Column identifiers are the Prisma-generated camelCase names
-- (quoted); table names are the @@map snake_case names.
--
-- Already handled DECLARATIVELY in the init migration (NOT repeated here):
--   * jsonb GIN indexes on "externalIds" (teams/players/competitions/matches/referees)
--   * OddsSnapshot composite index (matchId, marketKey, selection, capturedAt)
-- =====================================================================

-- 1) Trigram extension for fuzzy name search ---------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Trigram GIN indexes for fuzzy name search (fixture resolution, Phase 6) --
CREATE INDEX IF NOT EXISTS "teams_name_trgm_idx"
  ON "teams" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "players_name_trgm_idx"
  ON "players" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "competitions_name_trgm_idx"
  ON "competitions" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "referees_name_trgm_idx"
  ON "referees" USING gin ("name" gin_trgm_ops);

-- 3) BRIN indexes on append-only timestamps (smaller than B-tree at scale) ----
--    The B-tree @@index on these columns remains from the init migration for
--    small deployments; BRIN complements it for large time-range scans.
CREATE INDEX IF NOT EXISTS "odds_snapshots_capturedAt_brin"
  ON "odds_snapshots" USING brin ("capturedAt");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_brin"
  ON "audit_logs" USING brin ("createdAt");

-- 4) Partial-unique watchlist constraints (NULL-safe dedupe) ------------------
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_watch_user_team"
  ON "user_watchlists" ("userId", "teamId") WHERE "teamId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_watch_user_match"
  ON "user_watchlists" ("userId", "matchId") WHERE "matchId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_watch_user_competition"
  ON "user_watchlists" ("userId", "competitionId") WHERE "competitionId" IS NOT NULL;
-- Enforce "exactly one target":
ALTER TABLE "user_watchlists" ADD CONSTRAINT "watch_one_target" CHECK (
  (CASE WHEN "teamId"        IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN "matchId"       IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN "competitionId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- 5) Domain guards as CHECK constraints --------------------------------------
ALTER TABLE "recommendations"
  ADD CONSTRAINT "rec_risk_appetite_range" CHECK ("riskAppetite" BETWEEN 0 AND 100);
ALTER TABLE "analysis_reports"
  ADD CONSTRAINT "report_risk_appetite_range" CHECK ("riskAppetite" BETWEEN 0 AND 100);
ALTER TABLE "odds_snapshots"
  ADD CONSTRAINT "odds_price_gt_one" CHECK ("price" > 1.0);
ALTER TABLE "prediction_results"
  ADD CONSTRAINT "pr_model_prob_unit" CHECK ("modelProbability" >= 0 AND "modelProbability" <= 1);

-- 6) Materialized view: current team form (hot read path) --------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_team_current_form" AS
SELECT DISTINCT ON ("teamId", "seasonId", "venue")
       "teamId", "seasonId", "venue", "window", "avgGoalsFor", "avgGoalsAgainst",
       "avgXgFor", "avgXgAgainst", "form", "computedAt"
FROM "team_stats"
ORDER BY "teamId", "seasonId", "venue", "computedAt" DESC;
CREATE UNIQUE INDEX IF NOT EXISTS "mv_team_current_form_uniq"
  ON "mv_team_current_form" ("teamId", "seasonId", "venue");
-- Refresh after each ingestion/feature batch:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_team_current_form";

-- 7) Declarative partitioning (DOCUMENTED, intentionally NOT applied here) ----
--    DECISION: partitioning is deferred. Postgres requires the partition key to
--    be part of the PK, which conflicts with the surrogate cuid PKs Prisma
--    manages, and converting tables in-place would make this baseline migration
--    non-reversible and harder for `prisma migrate` to reason about. We keep the
--    tables non-partitioned until volume warrants it, then convert via a
--    dedicated raw migration (rename -> CREATE ... PARTITION BY RANGE ->
--    backfill -> drop) or adopt pg_partman / a Timescale hypertable. See §6.
--
--    ALTER TABLE "odds_snapshots" RENAME TO "odds_snapshots_legacy";
--    CREATE TABLE "odds_snapshots" (LIKE "odds_snapshots_legacy" INCLUDING ALL)
--      PARTITION BY RANGE ("capturedAt");
--    CREATE TABLE "odds_snapshots_2026_07" PARTITION OF "odds_snapshots"
--      FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
--    INSERT INTO "odds_snapshots" SELECT * FROM "odds_snapshots_legacy";
--    DROP TABLE "odds_snapshots_legacy";
--    -- Apply the same pattern to "audit_logs" ("createdAt") and "match_stats".

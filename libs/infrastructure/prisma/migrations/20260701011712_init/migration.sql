-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('USER', 'ANALYST', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'SELF_EXCLUDED', 'DELETED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'ES');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'CUP', 'UCL', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MarketGroup" AS ENUM ('MATCH_RESULT', 'HANDICAP', 'GOALS', 'HALVES', 'CORNERS', 'CARDS', 'SCORERS', 'CORRECT_SCORE');

-- CreateEnum
CREATE TYPE "MarketVolatility" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskBucket" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('SPORTS_DATA', 'ODDS', 'WEATHER', 'INJURY', 'LINEUP', 'REFEREE', 'LLM');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'DISABLED');

-- CreateEnum
CREATE TYPE "StatVenue" AS ENUM ('HOME', 'AWAY', 'ALL');

-- CreateEnum
CREATE TYPE "WatchlistTargetType" AS ENUM ('TEAM', 'MATCH', 'COMPETITION');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "locale" "Language" NOT NULL DEFAULT 'EN',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "ageConfirmedAt" TIMESTAMP(3),
    "selfLimitJson" JSONB,
    "selfExcludedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodEnd" TIMESTAMP(3),
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "WatchlistTargetType" NOT NULL,
    "teamId" TEXT,
    "matchId" TEXT,
    "competitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "externalIds" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "country" TEXT,
    "crestUrl" TEXT,
    "eloRating" DOUBLE PRECISION,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "externalIds" JSONB NOT NULL DEFAULT '{}',
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "dob" TIMESTAMP(3),
    "nationality" TEXT,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "externalIds" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT NOT NULL,
    "country" TEXT,
    "type" "CompetitionType" NOT NULL DEFAULT 'LEAGUE',
    "tier" INTEGER,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "externalIds" JSONB NOT NULL DEFAULT '{}',
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "refereeId" TEXT,
    "kickoffUtc" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "round" TEXT,
    "importance" DOUBLE PRECISION,
    "weatherId" TEXT,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather" (
    "id" TEXT NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "conditions" TEXT,
    "windKph" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "precipitationMm" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),

    CONSTRAINT "weather_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_stats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "homeXg" DECIMAL(6,3),
    "awayXg" DECIMAL(6,3),
    "homeCorners" INTEGER,
    "awayCorners" INTEGER,
    "homeYellow" INTEGER,
    "awayYellow" INTEGER,
    "homeRed" INTEGER,
    "awayRed" INTEGER,
    "homeShots" INTEGER,
    "awayShots" INTEGER,
    "homeShotsOnTarget" INTEGER,
    "awayShotsOnTarget" INTEGER,
    "homePossession" DECIMAL(5,2),
    "awayPossession" DECIMAL(5,2),
    "homeFouls" INTEGER,
    "awayFouls" INTEGER,
    "rawPayloadHash" TEXT,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_stats" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "venue" "StatVenue" NOT NULL DEFAULT 'ALL',
    "window" INTEGER NOT NULL DEFAULT 5,
    "featureVersion" TEXT NOT NULL DEFAULT 'v1',
    "avgGoalsFor" DOUBLE PRECISION,
    "avgGoalsAgainst" DOUBLE PRECISION,
    "avgXgFor" DOUBLE PRECISION,
    "avgXgAgainst" DOUBLE PRECISION,
    "avgCornersFor" DOUBLE PRECISION,
    "avgCornersAgainst" DOUBLE PRECISION,
    "avgCardsFor" DOUBLE PRECISION,
    "avgCardsAgainst" DOUBLE PRECISION,
    "cleanSheets" INTEGER,
    "form" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "apps" INTEGER,
    "minutes" INTEGER,
    "goals" INTEGER,
    "assists" INTEGER,
    "xg" DECIMAL(6,3),
    "xa" DECIMAL(6,3),
    "keyPasses" INTEGER,
    "yellow" INTEGER,
    "red" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referees" (
    "id" TEXT NOT NULL,
    "externalIds" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT NOT NULL,
    "country" TEXT,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referee_stats" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "matches" INTEGER,
    "avgYellow" DOUBLE PRECISION,
    "avgRed" DOUBLE PRECISION,
    "avgFouls" DOUBLE PRECISION,
    "avgPenalties" DOUBLE PRECISION,
    "homeBias" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referee_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_snapshots" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "price" DECIMAL(10,4) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,
    "fetchedAt" TIMESTAMP(3),

    CONSTRAINT "odds_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "betting_markets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "MarketGroup" NOT NULL,
    "volatility" "MarketVolatility" NOT NULL,
    "riskBaseline" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "betting_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "inputSnapshotHash" TEXT NOT NULL,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_inputs" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "featuresJson" JSONB NOT NULL,
    "featureVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_results" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "modelProbability" DECIMAL(6,5) NOT NULL,
    "impliedProbability" DECIMAL(6,5),
    "edge" DECIMAL(7,5),
    "expectedValue" DECIMAL(10,5),
    "suggestedStakePct" DECIMAL(6,4),
    "confidence" "ConfidenceLevel" NOT NULL,
    "risk" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "risk" "RiskLevel" NOT NULL,
    "isBestBet" BOOLEAN NOT NULL DEFAULT false,
    "riskAppetite" INTEGER NOT NULL,
    "riskBucket" "RiskBucket" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "contentJson" JSONB NOT NULL,
    "narrative" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "riskAppetite" INTEGER NOT NULL,
    "riskBucket" "RiskBucket" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'HEALTHY',
    "lastSyncAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "errorRate" DOUBLE PRECISION,
    "configRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "user_watchlists_userId_idx" ON "user_watchlists"("userId");

-- CreateIndex
CREATE INDEX "user_watchlists_teamId_idx" ON "user_watchlists"("teamId");

-- CreateIndex
CREATE INDEX "user_watchlists_matchId_idx" ON "user_watchlists"("matchId");

-- CreateIndex
CREATE INDEX "user_watchlists_competitionId_idx" ON "user_watchlists"("competitionId");

-- CreateIndex
CREATE INDEX "teams_externalIds_idx" ON "teams" USING GIN ("externalIds");

-- CreateIndex
CREATE INDEX "teams_name_idx" ON "teams"("name");

-- CreateIndex
CREATE INDEX "teams_country_idx" ON "teams"("country");

-- CreateIndex
CREATE INDEX "players_externalIds_idx" ON "players" USING GIN ("externalIds");

-- CreateIndex
CREATE INDEX "players_teamId_idx" ON "players"("teamId");

-- CreateIndex
CREATE INDEX "players_name_idx" ON "players"("name");

-- CreateIndex
CREATE INDEX "competitions_externalIds_idx" ON "competitions" USING GIN ("externalIds");

-- CreateIndex
CREATE INDEX "competitions_name_idx" ON "competitions"("name");

-- CreateIndex
CREATE INDEX "competitions_country_type_idx" ON "competitions"("country", "type");

-- CreateIndex
CREATE INDEX "seasons_competitionId_idx" ON "seasons"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_competitionId_label_key" ON "seasons"("competitionId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "matches_weatherId_key" ON "matches"("weatherId");

-- CreateIndex
CREATE INDEX "matches_kickoffUtc_idx" ON "matches"("kickoffUtc");

-- CreateIndex
CREATE INDEX "matches_homeTeamId_awayTeamId_idx" ON "matches"("homeTeamId", "awayTeamId");

-- CreateIndex
CREATE INDEX "matches_seasonId_idx" ON "matches"("seasonId");

-- CreateIndex
CREATE INDEX "matches_competitionId_idx" ON "matches"("competitionId");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_externalIds_idx" ON "matches" USING GIN ("externalIds");

-- CreateIndex
CREATE UNIQUE INDEX "match_stats_matchId_key" ON "match_stats"("matchId");

-- CreateIndex
CREATE INDEX "match_stats_matchId_idx" ON "match_stats"("matchId");

-- CreateIndex
CREATE INDEX "team_stats_teamId_seasonId_venue_window_idx" ON "team_stats"("teamId", "seasonId", "venue", "window");

-- CreateIndex
CREATE UNIQUE INDEX "team_stats_teamId_seasonId_venue_window_featureVersion_key" ON "team_stats"("teamId", "seasonId", "venue", "window", "featureVersion");

-- CreateIndex
CREATE INDEX "player_stats_playerId_seasonId_idx" ON "player_stats"("playerId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "player_stats_playerId_seasonId_key" ON "player_stats"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "referees_externalIds_idx" ON "referees" USING GIN ("externalIds");

-- CreateIndex
CREATE INDEX "referees_name_idx" ON "referees"("name");

-- CreateIndex
CREATE INDEX "referee_stats_refereeId_seasonId_idx" ON "referee_stats"("refereeId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "referee_stats_refereeId_seasonId_key" ON "referee_stats"("refereeId", "seasonId");

-- CreateIndex
CREATE INDEX "odds_snapshots_matchId_marketKey_selection_capturedAt_idx" ON "odds_snapshots"("matchId", "marketKey", "selection", "capturedAt");

-- CreateIndex
CREATE INDEX "odds_snapshots_capturedAt_idx" ON "odds_snapshots"("capturedAt");

-- CreateIndex
CREATE INDEX "odds_snapshots_bookmaker_idx" ON "odds_snapshots"("bookmaker");

-- CreateIndex
CREATE UNIQUE INDEX "betting_markets_key_key" ON "betting_markets"("key");

-- CreateIndex
CREATE INDEX "betting_markets_group_idx" ON "betting_markets"("group");

-- CreateIndex
CREATE INDEX "betting_markets_volatility_idx" ON "betting_markets"("volatility");

-- CreateIndex
CREATE INDEX "predictions_matchId_idx" ON "predictions"("matchId");

-- CreateIndex
CREATE INDEX "predictions_modelVersion_idx" ON "predictions"("modelVersion");

-- CreateIndex
CREATE INDEX "predictions_inputSnapshotHash_idx" ON "predictions"("inputSnapshotHash");

-- CreateIndex
CREATE INDEX "predictions_requestedById_idx" ON "predictions"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_inputs_predictionId_key" ON "prediction_inputs"("predictionId");

-- CreateIndex
CREATE INDEX "prediction_results_predictionId_marketKey_idx" ON "prediction_results"("predictionId", "marketKey");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_results_predictionId_marketKey_selection_key" ON "prediction_results"("predictionId", "marketKey", "selection");

-- CreateIndex
CREATE INDEX "recommendations_predictionId_idx" ON "recommendations"("predictionId");

-- CreateIndex
CREATE INDEX "recommendations_predictionId_isBestBet_idx" ON "recommendations"("predictionId", "isBestBet");

-- CreateIndex
CREATE INDEX "recommendations_riskBucket_idx" ON "recommendations"("riskBucket");

-- CreateIndex
CREATE INDEX "analysis_reports_matchId_idx" ON "analysis_reports"("matchId");

-- CreateIndex
CREATE INDEX "analysis_reports_predictionId_idx" ON "analysis_reports"("predictionId");

-- CreateIndex
CREATE INDEX "analysis_reports_language_idx" ON "analysis_reports"("language");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_name_key" ON "data_sources"("name");

-- CreateIndex
CREATE INDEX "data_sources_type_status_idx" ON "data_sources"("type", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "referees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_weatherId_fkey" FOREIGN KEY ("weatherId") REFERENCES "weather"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather" ADD CONSTRAINT "weather_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_stats" ADD CONSTRAINT "team_stats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_stats" ADD CONSTRAINT "team_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_stats" ADD CONSTRAINT "referee_stats_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "referees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_stats" ADD CONSTRAINT "referee_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_marketKey_fkey" FOREIGN KEY ("marketKey") REFERENCES "betting_markets"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_inputs" ADD CONSTRAINT "prediction_inputs_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_marketKey_fkey" FOREIGN KEY ("marketKey") REFERENCES "betting_markets"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_marketKey_fkey" FOREIGN KEY ("marketKey") REFERENCES "betting_markets"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

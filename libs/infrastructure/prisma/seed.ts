// libs/infrastructure/prisma/seed.ts
// Idempotent seed: every write is an upsert keyed on a unique/natural key, so running
// it repeatedly never duplicates rows (Phase-4 DoD: "seed runs clean, twice"). Run via
// `npm run db:seed` (Prisma loads .env, then executes this through @swc-node/register).
//
// Seeds: role catalog, the full BettingMarket catalog (keys aligned with the domain
// `MarketKey` union so odds FKs resolve), dev competitions/seasons, and the DataSource
// registry. This file is standalone (imports only @prisma/client) and is NOT part of the
// library build.
import {
  PrismaClient,
  RoleName,
  MarketGroup,
  MarketVolatility,
  CompetitionType,
  DataSourceType,
  DataSourceStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Roles (SPEC §9: user | analyst | admin) + permission catalogs.
// ---------------------------------------------------------------------------
const USER_PERMISSIONS = [
  'match:read',
  'prediction:read',
  'report:read',
  'watchlist:write',
  'subscription:read',
];
const ANALYST_PERMISSIONS = [
  ...USER_PERMISSIONS,
  'backtest:read',
  'model:read',
  'prediction:create',
];
const ADMIN_PERMISSIONS = ['*'];

const ROLES: ReadonlyArray<{ name: RoleName; permissions: string[] }> = [
  { name: RoleName.USER, permissions: USER_PERMISSIONS },
  { name: RoleName.ANALYST, permissions: ANALYST_PERMISSIONS },
  { name: RoleName.ADMIN, permissions: ADMIN_PERMISSIONS },
];

async function seedRoles(): Promise<void> {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: { name: role.name, permissions: role.permissions },
      update: { permissions: role.permissions },
    });
  }
  console.log(`  roles: ${ROLES.length} upserted`);
}

// ---------------------------------------------------------------------------
// BettingMarket catalog. Keys mirror the domain `MarketKey` union so OddsSnapshot /
// PredictionResult / Recommendation FKs (marketKey -> betting_markets.key) resolve.
// Volatility follows the Phase-4 rule: 1X2/OU/BTTS = low–med, corners/cards = med,
// correct-score/anytime-scorer = high.
// ---------------------------------------------------------------------------
interface MarketSeed {
  readonly key: string;
  readonly name: string;
  readonly group: MarketGroup;
  readonly volatility: MarketVolatility;
}

const MARKETS: ReadonlyArray<MarketSeed> = [
  { key: '1X2', name: 'Match Result', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
  { key: 'DOUBLE_CHANCE', name: 'Double Chance', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
  { key: 'DNB', name: 'Draw No Bet', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
  { key: 'OU_0_5', name: 'Over/Under 0.5 Goals', group: MarketGroup.GOALS, volatility: MarketVolatility.MEDIUM },
  { key: 'OU_1_5', name: 'Over/Under 1.5 Goals', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'OU_2_5', name: 'Over/Under 2.5 Goals', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'OU_3_5', name: 'Over/Under 3.5 Goals', group: MarketGroup.GOALS, volatility: MarketVolatility.MEDIUM },
  { key: 'BTTS', name: 'Both Teams To Score', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'AH', name: 'Asian Handicap', group: MarketGroup.HANDICAP, volatility: MarketVolatility.MEDIUM },
  { key: 'CORNERS_OU', name: 'Total Corners', group: MarketGroup.CORNERS, volatility: MarketVolatility.MEDIUM },
  { key: 'TEAM_CORNERS', name: 'Team Corners', group: MarketGroup.CORNERS, volatility: MarketVolatility.MEDIUM },
  { key: 'CARDS_OU', name: 'Total Cards', group: MarketGroup.CARDS, volatility: MarketVolatility.MEDIUM },
  { key: 'TEAM_CARDS', name: 'Team Cards', group: MarketGroup.CARDS, volatility: MarketVolatility.MEDIUM },
  { key: 'HTFT', name: 'Half-Time / Full-Time', group: MarketGroup.HALVES, volatility: MarketVolatility.HIGH },
  { key: 'ANYTIME_SCORER', name: 'Anytime Goalscorer', group: MarketGroup.SCORERS, volatility: MarketVolatility.HIGH },
  { key: 'CORRECT_SCORE', name: 'Correct Score', group: MarketGroup.CORRECT_SCORE, volatility: MarketVolatility.HIGH },
];

const RISK_BASELINE: Record<MarketVolatility, number> = {
  [MarketVolatility.LOW]: 0.25,
  [MarketVolatility.MEDIUM]: 0.5,
  [MarketVolatility.HIGH]: 0.8,
};

async function seedMarkets(): Promise<void> {
  for (const market of MARKETS) {
    const riskBaseline = RISK_BASELINE[market.volatility];
    await prisma.bettingMarket.upsert({
      where: { key: market.key },
      create: {
        key: market.key,
        name: market.name,
        group: market.group,
        volatility: market.volatility,
        riskBaseline,
        enabled: true,
      },
      update: {
        name: market.name,
        group: market.group,
        volatility: market.volatility,
        riskBaseline,
        enabled: true,
      },
    });
  }
  console.log(`  betting markets: ${MARKETS.length} upserted`);
}

// ---------------------------------------------------------------------------
// Dev competitions + a current season each. Stable ids make the upsert idempotent
// (Competition has no natural unique column).
// ---------------------------------------------------------------------------
interface CompetitionSeed {
  readonly id: string;
  readonly name: string;
  readonly country: string | null;
  readonly type: CompetitionType;
  readonly tier: number;
}

const COMPETITIONS: ReadonlyArray<CompetitionSeed> = [
  { id: 'seed-comp-epl', name: 'Premier League', country: 'England', type: CompetitionType.LEAGUE, tier: 1 },
  { id: 'seed-comp-laliga', name: 'La Liga', country: 'Spain', type: CompetitionType.LEAGUE, tier: 1 },
  { id: 'seed-comp-ucl', name: 'UEFA Champions League', country: null, type: CompetitionType.UCL, tier: 1 },
];

const CURRENT_SEASON_LABEL = '2025/26';

async function seedCompetitions(): Promise<void> {
  for (const competition of COMPETITIONS) {
    await prisma.competition.upsert({
      where: { id: competition.id },
      create: {
        id: competition.id,
        name: competition.name,
        country: competition.country,
        type: competition.type,
        tier: competition.tier,
      },
      update: {
        name: competition.name,
        country: competition.country,
        type: competition.type,
        tier: competition.tier,
      },
    });
    await prisma.season.upsert({
      where: {
        competitionId_label: {
          competitionId: competition.id,
          label: CURRENT_SEASON_LABEL,
        },
      },
      create: {
        competitionId: competition.id,
        label: CURRENT_SEASON_LABEL,
        startDate: new Date('2025-08-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T00:00:00.000Z'),
      },
      update: {},
    });
  }
  console.log(
    `  competitions: ${COMPETITIONS.length} upserted (+ ${COMPETITIONS.length} seasons)`,
  );
}

// ---------------------------------------------------------------------------
// DataSource registry (dev placeholders). configRef points at a secret reference,
// never the secret itself.
// ---------------------------------------------------------------------------
interface DataSourceSeed {
  readonly name: string;
  readonly type: DataSourceType;
  readonly configRef: string;
}

const DATA_SOURCES: ReadonlyArray<DataSourceSeed> = [
  { name: 'api-football', type: DataSourceType.SPORTS_DATA, configRef: 'vault:apifootball' },
  { name: 'odds-provider', type: DataSourceType.ODDS, configRef: 'vault:odds' },
  { name: 'weather-api', type: DataSourceType.WEATHER, configRef: 'vault:weather' },
  { name: 'llm', type: DataSourceType.LLM, configRef: 'vault:llm' },
];

async function seedDataSources(): Promise<void> {
  for (const source of DATA_SOURCES) {
    await prisma.dataSource.upsert({
      where: { name: source.name },
      create: {
        name: source.name,
        type: source.type,
        status: DataSourceStatus.HEALTHY,
        configRef: source.configRef,
      },
      update: { type: source.type, configRef: source.configRef },
    });
  }
  console.log(`  data sources: ${DATA_SOURCES.length} upserted`);
}

async function main(): Promise<void> {
  console.log('Seeding BetVision AI reference data...');
  await seedRoles();
  await seedMarkets();
  await seedCompetitions();
  await seedDataSources();
  console.log('Seed complete.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

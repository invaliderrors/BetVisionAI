// libs/infrastructure/prisma/seed-dev.ts
// =============================================================================================
//  SYNTHETIC DEV SEED — NOT REAL SPORTS DATA. Run via `npm run db:seed:dev`.
// =============================================================================================
// Inserts a small, DETERMINISTIC, clearly-labelled SYNTHETIC fixture set so the Phase-9 feature
// pipeline and a demo prediction have something to chew on. It is SEPARATE from the base
// `db:seed` (which holds real reference data). Everything here is stamped with provenance
// DataSource = DEV_SYNTHETIC; team NAMES are realistic-but-fictional for search UX, while all
// stats/odds are explicitly synthetic (CLAUDE.md: "Do not invent real sports data.").
//
// Idempotent: every write is an upsert keyed on a stable id / natural key, so running it twice
// leaves row counts unchanged.
import {
  PrismaClient,
  CompetitionType,
  MatchStatus,
  StatVenue,
  DataSourceType,
  DataSourceStatus,
  MarketGroup,
  MarketVolatility,
} from '@prisma/client';

export const DEV_SYNTHETIC = 'DEV_SYNTHETIC';

const COMPETITION_ID = 'dev-comp-synthetic';
const SEASON_ID = 'dev-season-synthetic';
const SEASON_LABEL = '2025/26';
const DEMO_MATCH_ID = 'dev-match-demo-1';
const DEMO_KICKOFF = new Date('2026-02-15T18:00:00.000Z');
const STATS_COMPUTED_AT = new Date('2026-02-01T00:00:00.000Z'); // strictly < demo kickoff (no leakage)

interface TeamSeed {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly elo: number;
}

const TEAMS: ReadonlyArray<TeamSeed> = [
  { id: 'dev-team-riverside', name: 'Riverside City', shortName: 'RIV', elo: 1680 },
  { id: 'dev-team-kingsford', name: 'Kingsford United', shortName: 'KGF', elo: 1625 },
  { id: 'dev-team-harborough', name: 'Harborough Rovers', shortName: 'HBR', elo: 1540 },
  { id: 'dev-team-ashford', name: 'Ashford Albion', shortName: 'ASH', elo: 1495 },
];

interface FinishedMatchSeed {
  readonly id: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly kickoff: Date;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly homeXg: number;
  readonly awayXg: number;
  readonly homeCorners: number;
  readonly awayCorners: number;
  readonly homeYellow: number;
  readonly awayYellow: number;
}

const FINISHED_MATCHES: ReadonlyArray<FinishedMatchSeed> = [
  {
    id: 'dev-match-hist-1',
    homeTeamId: 'dev-team-riverside',
    awayTeamId: 'dev-team-harborough',
    kickoff: new Date('2025-11-01T15:00:00.000Z'),
    homeGoals: 2, awayGoals: 1, homeXg: 1.9, awayXg: 1.1,
    homeCorners: 6, awayCorners: 4, homeYellow: 1, awayYellow: 2,
  },
  {
    id: 'dev-match-hist-2',
    homeTeamId: 'dev-team-kingsford',
    awayTeamId: 'dev-team-ashford',
    kickoff: new Date('2025-11-08T15:00:00.000Z'),
    homeGoals: 1, awayGoals: 1, homeXg: 1.3, awayXg: 1.2,
    homeCorners: 5, awayCorners: 5, homeYellow: 2, awayYellow: 1,
  },
];

// Per-team rolling stats (synthetic). One row per venue split; window 5, featureVersion v1.
interface TeamStatSeed {
  readonly avgGoalsFor: number;
  readonly avgGoalsAgainst: number;
  readonly avgXgFor: number;
  readonly avgXgAgainst: number;
  readonly avgCornersFor: number;
  readonly avgCornersAgainst: number;
  readonly avgCardsFor: number;
  readonly avgCardsAgainst: number;
  readonly cleanSheets: number;
  readonly form: string;
}

const TEAM_STAT_BY_ID: Readonly<Record<string, TeamStatSeed>> = {
  'dev-team-riverside': { avgGoalsFor: 2.1, avgGoalsAgainst: 0.9, avgXgFor: 1.95, avgXgAgainst: 1.0, avgCornersFor: 6.2, avgCornersAgainst: 3.8, avgCardsFor: 1.4, avgCardsAgainst: 1.9, cleanSheets: 7, form: 'WWDWL' },
  'dev-team-kingsford': { avgGoalsFor: 1.6, avgGoalsAgainst: 1.2, avgXgFor: 1.55, avgXgAgainst: 1.3, avgCornersFor: 5.1, avgCornersAgainst: 4.6, avgCardsFor: 1.8, avgCardsAgainst: 2.1, cleanSheets: 4, form: 'DWLDW' },
  'dev-team-harborough': { avgGoalsFor: 1.2, avgGoalsAgainst: 1.5, avgXgFor: 1.25, avgXgAgainst: 1.6, avgCornersFor: 4.4, avgCornersAgainst: 5.2, avgCardsFor: 2.0, avgCardsAgainst: 1.7, cleanSheets: 3, form: 'LDLWD' },
  'dev-team-ashford': { avgGoalsFor: 1.0, avgGoalsAgainst: 1.8, avgXgFor: 1.05, avgXgAgainst: 1.75, avgCornersFor: 4.0, avgCornersAgainst: 5.6, avgCardsFor: 2.2, avgCardsAgainst: 1.5, cleanSheets: 2, form: 'LLDLW' },
};

interface PlayerSeed {
  readonly id: string;
  readonly name: string;
  readonly teamId: string;
  readonly position: string;
  readonly goals: number;
  readonly assists: number;
}

const PLAYERS: ReadonlyArray<PlayerSeed> = [
  { id: 'dev-player-1', name: 'Alex Synthetic', teamId: 'dev-team-riverside', position: 'FWD', goals: 12, assists: 5 },
  { id: 'dev-player-2', name: 'Sam Placeholder', teamId: 'dev-team-kingsford', position: 'MID', goals: 6, assists: 8 },
];

// Synthetic odds for the demo match. Prices > 1.0 (odds CHECK constraint). Deterministic ids.
interface OddsSeed {
  readonly marketKey: string;
  readonly selection: string;
  readonly price: number;
}

const DEMO_ODDS: ReadonlyArray<OddsSeed> = [
  { marketKey: '1X2', selection: 'HOME', price: 1.95 },
  { marketKey: '1X2', selection: 'DRAW', price: 3.6 },
  { marketKey: '1X2', selection: 'AWAY', price: 4.2 },
  { marketKey: 'OU_2_5', selection: 'OVER', price: 1.85 },
  { marketKey: 'OU_2_5', selection: 'UNDER', price: 1.95 },
  { marketKey: 'BTTS', selection: 'YES', price: 1.8 },
  { marketKey: 'BTTS', selection: 'NO', price: 2.0 },
];

// Markets the demo odds reference (mirrors the base catalog so seed-dev runs standalone too).
const ODDS_MARKETS: ReadonlyArray<{ key: string; name: string; group: MarketGroup; volatility: MarketVolatility }> = [
  { key: '1X2', name: 'Match Result', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
  { key: 'OU_2_5', name: 'Over/Under 2.5 Goals', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
  { key: 'BTTS', name: 'Both Teams To Score', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
];

const DEV_EXTERNAL_IDS = { dev_synthetic: true } as const;

export interface SeedDevCounts {
  readonly dataSources: number;
  readonly teams: number;
  readonly matches: number;
  readonly matchStats: number;
  readonly teamStats: number;
  readonly players: number;
  readonly playerStats: number;
  readonly oddsSnapshots: number;
}

export async function seedDev(prisma: PrismaClient): Promise<SeedDevCounts> {
  // 1) Provenance marker.
  const source = await prisma.dataSource.upsert({
    where: { name: DEV_SYNTHETIC },
    create: { name: DEV_SYNTHETIC, type: DataSourceType.SPORTS_DATA, status: DataSourceStatus.HEALTHY, configRef: 'dev:synthetic' },
    update: { type: DataSourceType.SPORTS_DATA, configRef: 'dev:synthetic' },
  });
  const sourceId = source.id;

  // 2) Markets the demo odds FK depends on.
  for (const market of ODDS_MARKETS) {
    await prisma.bettingMarket.upsert({
      where: { key: market.key },
      create: { key: market.key, name: market.name, group: market.group, volatility: market.volatility },
      update: {},
    });
  }

  // 3) Isolated dev competition + season.
  await prisma.competition.upsert({
    where: { id: COMPETITION_ID },
    create: { id: COMPETITION_ID, name: 'Synthetic Dev League', type: CompetitionType.LEAGUE, tier: 1, sourceId },
    update: { name: 'Synthetic Dev League', sourceId },
  });
  await prisma.season.upsert({
    where: { id: SEASON_ID },
    create: { id: SEASON_ID, competitionId: COMPETITION_ID, label: SEASON_LABEL, startDate: new Date('2025-08-01T00:00:00.000Z'), endDate: new Date('2026-05-31T00:00:00.000Z') },
    update: { competitionId: COMPETITION_ID, label: SEASON_LABEL },
  });

  // 4) Teams (realistic-but-fictional names; synthetic provenance).
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { id: team.id },
      create: { id: team.id, name: team.name, shortName: team.shortName, eloRating: team.elo, externalIds: DEV_EXTERNAL_IDS, sourceId, fetchedAt: STATS_COMPUTED_AT },
      update: { name: team.name, shortName: team.shortName, eloRating: team.elo, sourceId },
    });
  }

  // 5) Rolling team stats (feed the feature pipeline via TeamRepository.findStats).
  for (const team of TEAMS) {
    const s = TEAM_STAT_BY_ID[team.id];
    for (const venue of [StatVenue.ALL, StatVenue.HOME, StatVenue.AWAY]) {
      await prisma.teamStats.upsert({
        where: {
          teamId_seasonId_venue_window_featureVersion: {
            teamId: team.id, seasonId: SEASON_ID, venue, window: 5, featureVersion: 'v1',
          },
        },
        create: { teamId: team.id, seasonId: SEASON_ID, venue, window: 5, featureVersion: 'v1', ...s, computedAt: STATS_COMPUTED_AT },
        update: { ...s, computedAt: STATS_COMPUTED_AT },
      });
    }
  }

  // 6) Demo (SCHEDULED) match — the one we compute features / a prediction for.
  await prisma.match.upsert({
    where: { id: DEMO_MATCH_ID },
    create: { id: DEMO_MATCH_ID, competitionId: COMPETITION_ID, seasonId: SEASON_ID, homeTeamId: 'dev-team-riverside', awayTeamId: 'dev-team-kingsford', kickoffUtc: DEMO_KICKOFF, status: MatchStatus.SCHEDULED, venue: 'Riverside Park (synthetic)', importance: 0.7, externalIds: DEV_EXTERNAL_IDS, sourceId, fetchedAt: STATS_COMPUTED_AT },
    update: { kickoffUtc: DEMO_KICKOFF, status: MatchStatus.SCHEDULED, sourceId },
  });

  // 7) Historical (FINISHED) matches + their MatchStats fact rows.
  for (const m of FINISHED_MATCHES) {
    await prisma.match.upsert({
      where: { id: m.id },
      create: { id: m.id, competitionId: COMPETITION_ID, seasonId: SEASON_ID, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, kickoffUtc: m.kickoff, status: MatchStatus.FINISHED, externalIds: DEV_EXTERNAL_IDS, sourceId, fetchedAt: STATS_COMPUTED_AT },
      update: { kickoffUtc: m.kickoff, status: MatchStatus.FINISHED, sourceId },
    });
    await prisma.matchStats.upsert({
      where: { matchId: m.id },
      create: { matchId: m.id, homeGoals: m.homeGoals, awayGoals: m.awayGoals, homeXg: m.homeXg, awayXg: m.awayXg, homeCorners: m.homeCorners, awayCorners: m.awayCorners, homeYellow: m.homeYellow, awayYellow: m.awayYellow, homeRed: 0, awayRed: 0, sourceId, fetchedAt: STATS_COMPUTED_AT },
      update: { homeGoals: m.homeGoals, awayGoals: m.awayGoals, sourceId },
    });
  }

  // 8) Players + season stats.
  for (const player of PLAYERS) {
    await prisma.player.upsert({
      where: { id: player.id },
      create: { id: player.id, name: player.name, teamId: player.teamId, position: player.position, externalIds: DEV_EXTERNAL_IDS, sourceId, fetchedAt: STATS_COMPUTED_AT },
      update: { name: player.name, teamId: player.teamId, position: player.position, sourceId },
    });
    await prisma.playerStats.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: SEASON_ID } },
      create: { playerId: player.id, seasonId: SEASON_ID, apps: 18, minutes: 1520, goals: player.goals, assists: player.assists, yellow: 2, red: 0 },
      update: { goals: player.goals, assists: player.assists },
    });
  }

  // 9) Synthetic odds for the demo match (deterministic ids -> idempotent).
  for (const odds of DEMO_ODDS) {
    const id = `dev-odds-${DEMO_MATCH_ID}-${odds.marketKey}-${odds.selection}`;
    await prisma.oddsSnapshot.upsert({
      where: { id },
      create: { id, matchId: DEMO_MATCH_ID, bookmaker: 'synthetic-book', marketKey: odds.marketKey, selection: odds.selection, price: odds.price, capturedAt: STATS_COMPUTED_AT, sourceId, fetchedAt: STATS_COMPUTED_AT },
      update: { price: odds.price, sourceId },
    });
  }

  // Counts (dev-scoped) for the idempotency assertion.
  const [dataSources, teams, matches, matchStats, teamStats, players, playerStats, oddsSnapshots] =
    await Promise.all([
      prisma.dataSource.count({ where: { name: DEV_SYNTHETIC } }),
      prisma.team.count({ where: { sourceId } }),
      prisma.match.count({ where: { sourceId } }),
      prisma.matchStats.count({ where: { sourceId } }),
      prisma.teamStats.count({ where: { seasonId: SEASON_ID } }),
      prisma.player.count({ where: { sourceId } }),
      prisma.playerStats.count({ where: { seasonId: SEASON_ID } }),
      prisma.oddsSnapshot.count({ where: { sourceId } }),
    ]);
  return { dataSources, teams, matches, matchStats, teamStats, players, playerStats, oddsSnapshots };
}

// Standalone runner (only when executed directly, NOT when imported by a test).
if (require.main === module) {
  const prisma = new PrismaClient();
  seedDev(prisma)
    .then((counts) => {
      console.log('SYNTHETIC DEV seed complete (provenance DEV_SYNTHETIC):');
      console.log(JSON.stringify(counts, null, 2));
    })
    .catch((error: unknown) => {
      console.error('Dev seed failed:', error);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}

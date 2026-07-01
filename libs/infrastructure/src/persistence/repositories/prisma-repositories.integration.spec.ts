// Repository integration tests against a REAL Postgres (the compose `postgres` service;
// pg_trgm + CHECK constraints exercised, not mocked). Requires DATABASE_URL; the suite skips
// cleanly when it is absent so unit-only runs never hang.
//
// Verifies (Phase 6): the FLESHED-OUT Match aggregate round-trips on REAL team/season FK ids
// (the Phase-4 name-resolution stopgap is gone), find-with-relations rebuilds the detail read
// model, pg_trgm team search ranks by similarity, candidate search resolves a team pair, and
// the append-only odds queries + CHECK constraints still hold.
import {
  PrismaClient,
  MarketGroup,
  MarketVolatility,
  MatchStatus,
} from '@prisma/client';
import {
  Match,
  type OddsSnapshotRecord,
  type MatchId,
  type TeamId,
  type MarketKey,
  type CompetitionId,
  type SeasonId,
  type IsoDateTime,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaMatchRepository } from './prisma-match.repository';
import { PrismaTeamRepository } from './prisma-team.repository';
import { PrismaCompetitionRepository } from './prisma-competition.repository';
import { PrismaOddsRepository } from './prisma-odds.repository';

jest.setTimeout(30000);

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;

describeDb('Prisma repositories (real Postgres)', () => {
  const prisma = new PrismaService();
  const rawClient = prisma as PrismaClient;
  const matchRepo = new PrismaMatchRepository(prisma);
  const teamRepo = new PrismaTeamRepository(prisma);
  const competitionRepo = new PrismaCompetitionRepository(prisma);
  const oddsRepo = new PrismaOddsRepository(prisma);

  const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  const competitionId = `test-comp-${suffix}` as CompetitionId;
  const competitionName = `Test League ${suffix}`;
  const seasonId = `test-season-${suffix}` as SeasonId;
  const homeTeamId = `test-home-${suffix}` as TeamId;
  const awayTeamId = `test-away-${suffix}` as TeamId;
  const refereeId = `test-ref-${suffix}`;
  const matchId = `test-match-${suffix}` as MatchId;
  const homeName = `Real Madrid ${suffix}`;
  const awayName = `Barcelona ${suffix}`;
  const refereeName = `Referee ${suffix}`;
  const kickoffUtc = new Date('2026-02-01T20:00:00.000Z').toISOString() as IsoDateTime;

  function makeMatch(): Match {
    const result = Match.create({
      id: matchId,
      competitionId,
      seasonId,
      homeTeamId,
      awayTeamId,
      kickoffUtc,
      status: 'scheduled',
      venue: 'Santiago Bernabéu',
      round: '25',
      importance: 0.8,
    });
    if (!result.ok) throw new Error(`fixture invalid: ${result.error.code}`);
    return result.value;
  }

  beforeAll(async () => {
    await prisma.$connect();
    // Reference data the odds FK (marketKey -> betting_markets.key) depends on.
    await rawClient.bettingMarket.upsert({
      where: { key: '1X2' },
      create: { key: '1X2', name: 'Match Result', group: MarketGroup.MATCH_RESULT, volatility: MarketVolatility.LOW },
      update: {},
    });
    await rawClient.bettingMarket.upsert({
      where: { key: 'OU_2_5' },
      create: { key: 'OU_2_5', name: 'Over/Under 2.5 Goals', group: MarketGroup.GOALS, volatility: MarketVolatility.LOW },
      update: {},
    });
    // Master data: competition + season + the two teams + a referee (all with REAL ids).
    await rawClient.competition.create({ data: { id: competitionId, name: competitionName } });
    await rawClient.season.create({ data: { id: seasonId, competitionId, label: '2025/26' } });
    await rawClient.team.create({ data: { id: homeTeamId, name: homeName, shortName: 'RMA' } });
    await rawClient.team.create({ data: { id: awayTeamId, name: awayName, shortName: 'FCB' } });
    await rawClient.referee.create({ data: { id: refereeId, name: refereeName } });
    // Persist the fixture up-front so the odds FK (matchId) resolves for the odds suite.
    await matchRepo.save(makeMatch());
  });

  afterAll(async () => {
    await rawClient.oddsSnapshot.deleteMany({ where: { matchId } });
    await rawClient.match.deleteMany({ where: { id: matchId } });
    await rawClient.referee.deleteMany({ where: { id: refereeId } });
    await rawClient.team.deleteMany({ where: { id: { in: [homeTeamId, awayTeamId] } } });
    await rawClient.season.deleteMany({ where: { id: seasonId } });
    await rawClient.competition.deleteMany({ where: { id: competitionId } });
    await prisma.$disconnect();
  });

  describe('PrismaMatchRepository', () => {
    it('round-trips the fleshed-out aggregate on REAL team/season ids (stopgap gone)', async () => {
      await matchRepo.save(makeMatch());

      const loaded = await matchRepo.findById(matchId);

      expect(loaded).not.toBeNull();
      // The aggregate carries the exact FK ids we persisted — NOT name-resolved surrogates.
      expect(loaded?.homeTeamId).toBe(homeTeamId);
      expect(loaded?.awayTeamId).toBe(awayTeamId);
      expect(loaded?.competitionId).toBe(competitionId);
      expect(loaded?.seasonId).toBe(seasonId);
      expect(loaded?.status).toBe('scheduled');
      expect(loaded?.venue).toBe('Santiago Bernabéu');
      expect(loaded?.round).toBe('25');
      expect(loaded?.importance).toBeCloseTo(0.8, 5);
      expect(loaded?.kickoffUtc).toBe(kickoffUtc);

      // Prove the persisted row uses the seeded season (no "latest season" guessing).
      const row = await rawClient.match.findUnique({ where: { id: matchId } });
      expect(row?.seasonId).toBe(seasonId);
      expect(row?.homeTeamId).toBe(homeTeamId);
      expect(row?.status).toBe(MatchStatus.SCHEDULED);
    });

    it('save() is idempotent on repeated calls (upsert by id)', async () => {
      await matchRepo.save(makeMatch());
      await matchRepo.save(makeMatch());
      const count = await rawClient.match.count({ where: { id: matchId } });
      expect(count).toBe(1);
    });

    it('findDetailById() rebuilds the detail read model with relations', async () => {
      // Assign the referee at the row level (the aggregate does not carry it) to exercise the join.
      await rawClient.match.update({ where: { id: matchId }, data: { refereeId } });

      const detail = await matchRepo.findDetailById(matchId);

      expect(detail).not.toBeNull();
      expect(detail?.home.name).toBe(homeName);
      expect(detail?.away.name).toBe(awayName);
      expect(detail?.competition.name).toBe(competitionName);
      expect(detail?.seasonLabel).toBe('2025/26');
      expect(detail?.referee?.name).toBe(refereeName);
      expect(detail?.stats).toBeNull();
    });

    it('findByTeams() resolves a fixture for the team pair (either orientation)', async () => {
      const candidates = await matchRepo.findByTeams({
        homeTeamIds: [homeTeamId],
        awayTeamIds: [awayTeamId],
        competitionId,
      });

      expect(candidates.length).toBeGreaterThan(0);
      const top = candidates.find((c) => c.matchId === matchId);
      expect(top).toBeDefined();
      expect(top?.home.name).toBe(homeName);
      expect(top?.away.name).toBe(awayName);
      expect(top?.competition.name).toBe(competitionName);
    });
  });

  describe('PrismaTeamRepository', () => {
    it('searchByName() ranks teams by pg_trgm similarity', async () => {
      const results = await teamRepo.searchByName(homeName);

      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.team.name).toBe(homeName);
      expect(top.score).toBeGreaterThan(0);
      expect(top.score).toBeLessThanOrEqual(1);
      // Exact-name match scores 1.0; scores are sorted descending.
      expect(top.score).toBeCloseTo(1, 5);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('findById() maps a row to a Team aggregate', async () => {
      const team = await teamRepo.findById(homeTeamId);
      expect(team?.name).toBe(homeName);
      expect(team?.shortName).toBe('RMA');
    });
  });

  describe('PrismaCompetitionRepository', () => {
    it('findById() + findSeasons() return domain entities', async () => {
      const competition = await competitionRepo.findById(competitionId);
      expect(competition?.name).toBe(competitionName);

      const seasons = await competitionRepo.findSeasons(competitionId);
      expect(seasons.map((s) => s.label)).toContain('2025/26');
    });
  });

  describe('PrismaOddsRepository', () => {
    const t1 = new Date('2026-01-31T10:00:00.000Z').toISOString() as IsoDateTime;
    const t2 = new Date('2026-01-31T12:00:00.000Z').toISOString() as IsoDateTime;

    const snapshots: OddsSnapshotRecord[] = [
      { matchId, bookmaker: 'bet365', market: '1X2' as MarketKey, selection: 'HOME', priceDecimal: 2.1, capturedAt: t1 },
      { matchId, bookmaker: 'bet365', market: '1X2' as MarketKey, selection: 'HOME', priceDecimal: 2.05, capturedAt: t2 },
      { matchId, bookmaker: 'pinnacle', market: 'OU_2_5' as MarketKey, selection: 'OVER', priceDecimal: 1.9, capturedAt: t1 },
    ];

    beforeAll(async () => {
      await rawClient.oddsSnapshot.deleteMany({ where: { matchId } });
      await oddsRepo.saveSnapshots(snapshots);
    });

    it('findMovement() returns the ordered time-series (index-backed composite query)', async () => {
      const movement = await oddsRepo.findMovement(matchId, '1X2' as MarketKey, 'HOME');
      expect(movement.map((m) => m.priceDecimal)).toEqual([2.1, 2.05]);
      expect(movement[0].capturedAt).toBe(t1);
      expect(movement[1].capturedAt).toBe(t2);
    });

    it('findLatest() returns the newest price per (market, selection)', async () => {
      const latest = await oddsRepo.findLatest(matchId, ['1X2' as MarketKey]);
      expect(latest).toHaveLength(1);
      expect(latest[0].market).toBe('1X2');
      expect(latest[0].priceDecimal).toBeCloseTo(2.05, 4);
    });

    it('findLatest() without a market filter spans all markets', async () => {
      const latest = await oddsRepo.findLatest(matchId);
      const keys = latest.map((r) => `${r.market}:${r.selection}`).sort();
      expect(keys).toEqual(['1X2:HOME', 'OU_2_5:OVER']);
    });

    it('saveSnapshots() is atomic: a bad market FK rolls back the whole batch', async () => {
      const batch: OddsSnapshotRecord[] = [
        { matchId, bookmaker: 'x', market: '1X2' as MarketKey, selection: 'DRAW', priceDecimal: 3.4, capturedAt: t1 },
        { matchId, bookmaker: 'x', market: 'NOPE_MARKET' as MarketKey, selection: 'DRAW', priceDecimal: 3.4, capturedAt: t1 },
      ];
      await expect(oddsRepo.saveSnapshots(batch)).rejects.toBeDefined();
      const draw = await oddsRepo.findMovement(matchId, '1X2' as MarketKey, 'DRAW');
      expect(draw).toHaveLength(0);
    });

    it('enforces the manual-SQL CHECK constraint (odds price must be > 1.0)', async () => {
      const bad: OddsSnapshotRecord[] = [
        { matchId, bookmaker: 'x', market: '1X2' as MarketKey, selection: 'HOME', priceDecimal: 0.5, capturedAt: t1 },
      ];
      await expect(oddsRepo.saveSnapshots(bad)).rejects.toBeDefined();
    });
  });
});

// Repository integration tests against a REAL Postgres (the compose `postgres`
// service; pg_trgm + CHECK constraints exercised, not mocked). Requires DATABASE_URL;
// the suite skips cleanly when it is absent so unit-only runs never hang.
//
// Verifies: mapping round-trips (domain -> persist -> load -> domain), a trigram
// search, an index-backed odds query, transactional/atomic batch writes, and that
// the manual-SQL CHECK constraints are active.
import { PrismaClient, MarketGroup, MarketVolatility } from '@prisma/client';
import {
  Match,
  type OddsSnapshotRecord,
  type MatchId,
  type MarketKey,
  type CompetitionId,
  type IsoDateTime,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaMatchRepository } from './prisma-match.repository';
import { PrismaOddsRepository } from './prisma-odds.repository';

jest.setTimeout(30000);

const describeDb = process.env['DATABASE_URL'] ? describe : describe.skip;

describeDb('Prisma repositories (real Postgres)', () => {
  const prisma = new PrismaService();
  const rawClient = prisma as PrismaClient; // same instance, PrismaClient surface
  const matchRepo = new PrismaMatchRepository(prisma);
  const oddsRepo = new PrismaOddsRepository(prisma);

  const suffix = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  const competitionId = `test-comp-${suffix}`;
  const competitionName = `Test League ${suffix}`;
  const matchId = `test-match-${suffix}` as MatchId;
  const homeName = `Real Madrid ${suffix}`;
  const awayName = `Barcelona ${suffix}`;
  const kickoffUtc = new Date('2026-02-01T20:00:00.000Z').toISOString() as IsoDateTime;

  beforeAll(async () => {
    await prisma.$connect();
    // Reference data the odds FK (marketKey -> betting_markets.key) depends on.
    await rawClient.bettingMarket.upsert({
      where: { key: '1X2' },
      create: {
        key: '1X2',
        name: 'Match Result',
        group: MarketGroup.MATCH_RESULT,
        volatility: MarketVolatility.LOW,
      },
      update: {},
    });
    await rawClient.bettingMarket.upsert({
      where: { key: 'OU_2_5' },
      create: {
        key: 'OU_2_5',
        name: 'Over/Under 2.5 Goals',
        group: MarketGroup.GOALS,
        volatility: MarketVolatility.LOW,
      },
      update: {},
    });
    // A competition + season so `save()` can attach the match (see adapter note).
    await rawClient.competition.create({
      data: { id: competitionId, name: competitionName },
    });
    await rawClient.season.create({
      data: { competitionId, label: '2025/26' },
    });
  });

  afterAll(async () => {
    await rawClient.oddsSnapshot.deleteMany({ where: { matchId } });
    await rawClient.match.deleteMany({ where: { id: matchId } });
    await rawClient.team.deleteMany({ where: { name: { in: [homeName, awayName] } } });
    await rawClient.season.deleteMany({ where: { competitionId } });
    await rawClient.competition.deleteMany({ where: { id: competitionId } });
    await prisma.$disconnect();
  });

  function makeMatch(): Match {
    const result = Match.create({
      id: matchId,
      homeName,
      awayName,
      competitionId: competitionId as unknown as CompetitionId,
      competition: competitionName,
      kickoffUtc,
    });
    if (!result.ok) throw new Error(`fixture invalid: ${result.error.code}`);
    return result.value;
  }

  describe('PrismaMatchRepository', () => {
    it('round-trips a Match (domain -> persist -> load -> domain)', async () => {
      await matchRepo.save(makeMatch());

      const loaded = await matchRepo.findById(matchId);

      expect(loaded).not.toBeNull();
      expect(loaded?.homeName).toBe(homeName);
      expect(loaded?.awayName).toBe(awayName);
      expect(loaded?.competition).toBe(competitionName);
      expect(loaded?.kickoffUtc).toBe(kickoffUtc);
      expect(loaded?.label).toBe(`${homeName} vs ${awayName}`);
    });

    it('save() is idempotent on repeated calls (upsert by id)', async () => {
      await matchRepo.save(makeMatch());
      await matchRepo.save(makeMatch());

      const count = await rawClient.match.count({ where: { id: matchId } });
      expect(count).toBe(1);
    });

    it('search() ranks candidates by pg_trgm similarity', async () => {
      const candidates = await matchRepo.search({
        text: `${homeName} vs ${awayName}`,
        competitionId: competitionId as unknown as CompetitionId,
      });

      expect(candidates.length).toBeGreaterThan(0);
      const top = candidates[0];
      expect(top.matchId).toBe(matchId);
      expect(top.homeName).toBe(homeName);
      expect(top.confidence).toBeGreaterThan(0);
      expect(top.confidence).toBeLessThanOrEqual(1);
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
      expect(latest[0].selection).toBe('HOME');
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
      expect(draw).toHaveLength(0); // the first row was rolled back with the batch
    });

    it('enforces the manual-SQL CHECK constraint (odds price must be > 1.0)', async () => {
      const bad: OddsSnapshotRecord[] = [
        { matchId, bookmaker: 'x', market: '1X2' as MarketKey, selection: 'HOME', priceDecimal: 0.5, capturedAt: t1 },
      ];

      await expect(oddsRepo.saveSnapshots(bad)).rejects.toBeDefined();
    });
  });
});

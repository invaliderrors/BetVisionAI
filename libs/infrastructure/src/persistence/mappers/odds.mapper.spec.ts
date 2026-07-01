// Pure unit tests for the odds mapper — no DB, no framework. Proves the persistence
// <-> domain translation round-trips and normalizes Prisma's Decimal to a JS number.
import { Prisma } from '@prisma/client';
import type { OddsSnapshotRecord, MatchId, MarketKey } from '@betvision/domain';
import {
  toDomainOdds,
  toPersistenceOdds,
  type OddsSnapshotRow,
} from './odds.mapper';

describe('odds.mapper', () => {
  const record: OddsSnapshotRecord = {
    matchId: 'match-123' as MatchId,
    bookmaker: 'bet365',
    market: '1X2' as MarketKey,
    selection: 'HOME',
    priceDecimal: 2.05,
    capturedAt: '2026-02-01T20:00:00.000Z',
  };

  describe('toPersistenceOdds', () => {
    it('maps domain record -> Prisma createMany input (market -> marketKey, Decimal price)', () => {
      const input = toPersistenceOdds(record);

      expect(input.matchId).toBe('match-123');
      expect(input.bookmaker).toBe('bet365');
      expect(input.marketKey).toBe('1X2');
      expect(input.selection).toBe('HOME');
      expect(input.price).toBeInstanceOf(Prisma.Decimal);
      expect((input.price as Prisma.Decimal).toNumber()).toBeCloseTo(2.05, 5);
      expect(input.capturedAt).toEqual(new Date('2026-02-01T20:00:00.000Z'));
    });
  });

  describe('toDomainOdds', () => {
    it('maps a Prisma row (Decimal price, Date capturedAt) -> domain record', () => {
      const row: OddsSnapshotRow = {
        matchId: 'match-123',
        bookmaker: 'bet365',
        marketKey: '1X2',
        selection: 'HOME',
        price: new Prisma.Decimal('2.05'),
        capturedAt: new Date('2026-02-01T20:00:00.000Z'),
      };

      const result = toDomainOdds(row);

      expect(result).toEqual(record);
      expect(typeof result.priceDecimal).toBe('number');
    });

    it('normalizes a numeric or string price (driver variance) to a number', () => {
      const base: Omit<OddsSnapshotRow, 'price'> = {
        matchId: 'm',
        bookmaker: 'b',
        marketKey: 'OU_2_5',
        selection: 'OVER',
        capturedAt: new Date('2026-02-01T20:00:00.000Z'),
      };

      expect(toDomainOdds({ ...base, price: 1.9 }).priceDecimal).toBeCloseTo(1.9, 5);
      expect(toDomainOdds({ ...base, price: '1.9' }).priceDecimal).toBeCloseTo(1.9, 5);
    });
  });

  it('round-trips domain -> persistence -> domain without drift', () => {
    const input = toPersistenceOdds(record);
    const back = toDomainOdds({
      matchId: input.matchId,
      bookmaker: input.bookmaker,
      marketKey: input.marketKey,
      selection: input.selection,
      price: input.price as Prisma.Decimal,
      capturedAt: input.capturedAt as Date,
    });

    expect(back).toEqual(record);
  });
});

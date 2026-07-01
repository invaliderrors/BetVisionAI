// libs/infrastructure/src/persistence/mappers/odds.mapper.ts
// Persistence <-> domain translation for odds snapshots. Pure functions, no IO.
// `OddsSnapshotRecord` is the domain-facing shape; Prisma's Decimal/Date stay here.
import { Prisma } from '@prisma/client';
import type {
  OddsSnapshotRecord,
  MatchId,
  MarketKey,
  IsoDateTime,
} from '@betvision/domain';

/** Raw shape returned by the DISTINCT-ON `$queryRaw` in the repository. */
export interface OddsSnapshotRow {
  readonly matchId: string;
  readonly bookmaker: string;
  readonly marketKey: string;
  readonly selection: string;
  readonly price: Prisma.Decimal | number | string;
  readonly capturedAt: Date;
}

/** Prisma Decimal (or a driver-provided number/string) -> plain JS number. */
function toNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

/** Prisma OddsSnapshot row -> domain OddsSnapshotRecord. */
export function toDomainOdds(row: OddsSnapshotRow): OddsSnapshotRecord {
  return {
    matchId: row.matchId as MatchId,
    bookmaker: row.bookmaker,
    market: row.marketKey as MarketKey,
    selection: row.selection,
    priceDecimal: toNumber(row.price),
    capturedAt: row.capturedAt.toISOString() as IsoDateTime,
  };
}

/** Domain OddsSnapshotRecord -> Prisma createMany input (append-only insert). */
export function toPersistenceOdds(
  record: OddsSnapshotRecord,
): Prisma.OddsSnapshotCreateManyInput {
  return {
    matchId: record.matchId,
    bookmaker: record.bookmaker,
    marketKey: record.market,
    selection: record.selection,
    price: new Prisma.Decimal(record.priceDecimal),
    capturedAt: new Date(record.capturedAt),
  };
}

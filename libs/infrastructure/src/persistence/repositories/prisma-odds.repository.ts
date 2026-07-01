// libs/infrastructure/src/persistence/repositories/prisma-odds.repository.ts
// Adapter implementing the domain OddsRepositoryPort against the append-only
// odds_snapshots time-series. Returns/accepts ONLY domain OddsSnapshotRecord.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  OddsRepositoryPort,
  OddsSnapshotRecord,
  MatchId,
  MarketKey,
} from '@betvision/domain';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toDomainOdds,
  toPersistenceOdds,
  type OddsSnapshotRow,
} from '../mappers/odds.mapper';

@Injectable()
export class PrismaOddsRepository implements OddsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Latest price per (market, selection) for a fixture. Uses `DISTINCT ON` over the
   * `(matchId, marketKey, selection, capturedAt)` composite index — one index scan,
   * newest row per selection.
   */
  async findLatest(
    matchId: MatchId,
    markets?: MarketKey[],
  ): Promise<OddsSnapshotRecord[]> {
    const marketFilter =
      markets && markets.length > 0
        ? Prisma.sql`AND "marketKey" IN (${Prisma.join(markets)})`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<OddsSnapshotRow[]>(Prisma.sql`
      SELECT DISTINCT ON ("marketKey", "selection")
             "matchId", "bookmaker", "marketKey", "selection", "price", "capturedAt"
      FROM "odds_snapshots"
      WHERE "matchId" = ${matchId}
      ${marketFilter}
      ORDER BY "marketKey", "selection", "capturedAt" DESC
    `);

    return rows.map(toDomainOdds);
  }

  /** Full movement history for one market/selection (backbone of CLV). */
  async findMovement(
    matchId: MatchId,
    market: MarketKey,
    selection: string,
  ): Promise<OddsSnapshotRecord[]> {
    const rows = await this.prisma.oddsSnapshot.findMany({
      where: { matchId, marketKey: market, selection },
      orderBy: { capturedAt: 'asc' },
    });

    return rows.map((row) =>
      toDomainOdds({
        matchId: row.matchId,
        bookmaker: row.bookmaker,
        marketKey: row.marketKey,
        selection: row.selection,
        price: row.price,
        capturedAt: row.capturedAt,
      }),
    );
  }

  /** Append-only batch insert, wrapped in a transaction so the batch is atomic. */
  async saveSnapshots(
    snapshots: ReadonlyArray<OddsSnapshotRecord>,
  ): Promise<void> {
    if (snapshots.length === 0) return;
    const data = snapshots.map(toPersistenceOdds);
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.oddsSnapshot.createMany({ data });
    });
  }
}

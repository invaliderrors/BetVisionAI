// libs/infrastructure/src/providers/dev/dev-odds.provider.ts
// SYNTHETIC DEV adapter for OddsProviderPort. Deterministic decimal odds (> 1.0) seeded by
// (matchId, market, selection) — NOT real prices (provenance DEV_SYNTHETIC).
import { Injectable } from '@nestjs/common';
import type {
  OddsProviderPort,
  OddsQuery,
  OddsSnapshotDto,
  Provenanced,
  MarketKey,
  IsoDateTime,
} from '@betvision/domain';
import { DEV_SYNTHETIC, devProvenanced, makeRng, between } from './dev-synthetic';

/** Default synthetic markets + their selections when the query does not restrict markets. */
const MARKET_SELECTIONS: ReadonlyArray<{ market: MarketKey; selections: readonly string[] }> = [
  { market: '1X2', selections: ['HOME', 'DRAW', 'AWAY'] },
  { market: 'OU_2_5', selections: ['OVER', 'UNDER'] },
  { market: 'BTTS', selections: ['YES', 'NO'] },
];

const BOOKMAKER = 'synthetic-book';
const CAPTURED_AT = '2026-01-25T09:00:00.000Z' as IsoDateTime; // deterministic, pre-kickoff

@Injectable()
export class DevOddsProvider implements OddsProviderPort {
  async getOdds(query: OddsQuery): Promise<Provenanced<OddsSnapshotDto[]>> {
    const wanted = query.markets && query.markets.length > 0 ? new Set(query.markets) : null;
    const snapshots: OddsSnapshotDto[] = [];
    for (const { market, selections } of MARKET_SELECTIONS) {
      if (wanted && !wanted.has(market)) continue;
      for (const selection of selections) {
        const rng = makeRng(`odds|${query.matchId}|${market}|${selection}`);
        snapshots.push({
          bookmaker: `${BOOKMAKER}:${DEV_SYNTHETIC.toLowerCase()}`,
          market,
          selection,
          // Odds CHECK constraint requires price > 1.0 — synthetic band [1.20, 6.00].
          priceDecimal: between(rng, 1.2, 6.0, 2),
          capturedAt: CAPTURED_AT,
        });
      }
    }
    return devProvenanced(snapshots);
  }
}

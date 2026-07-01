// libs/domain/src/ports/odds-repository.port.ts
import type { MatchId, IsoDateTime } from './shared.dto';
import type { MarketKey } from '../value-objects/market';

export interface OddsSnapshotRecord {
  readonly matchId: MatchId;
  readonly bookmaker: string;
  readonly market: MarketKey;
  readonly selection: string;
  readonly priceDecimal: number;
  readonly capturedAt: IsoDateTime;
}

export interface OddsRepositoryPort {
  /** Latest price per (market, selection) for a fixture. */
  findLatest(matchId: MatchId, markets?: MarketKey[]): Promise<OddsSnapshotRecord[]>;
  /** Full movement history (backbone of CLV) for one market/selection. */
  findMovement(
    matchId: MatchId,
    market: MarketKey,
    selection: string,
  ): Promise<OddsSnapshotRecord[]>;
  /** Append-only persistence (time-series). */
  saveSnapshots(snapshots: ReadonlyArray<OddsSnapshotRecord>): Promise<void>;
}

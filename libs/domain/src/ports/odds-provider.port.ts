// libs/domain/src/ports/odds-provider.port.ts
import type { Provenanced, MatchId, IsoDateTime } from './shared.dto';
import type { MarketKey } from '../value-objects/market';

export interface OddsQuery {
  readonly matchId: MatchId;
  readonly markets?: MarketKey[];
}
export interface OddsSnapshotDto {
  readonly bookmaker: string;
  readonly market: MarketKey;
  readonly selection: string;
  readonly priceDecimal: number;
  readonly capturedAt: IsoDateTime;
}

export interface OddsProviderPort {
  getOdds(query: OddsQuery): Promise<Provenanced<OddsSnapshotDto[]>>;
}

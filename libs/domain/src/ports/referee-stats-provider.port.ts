// libs/domain/src/ports/referee-stats-provider.port.ts
import type { Provenanced, RefereeId, SeasonId } from './shared.dto';

export interface RefereeStatsDto {
  readonly refereeId: RefereeId;
  readonly avgYellow: number;
  readonly avgRed: number;
  readonly avgFouls: number;
  readonly avgPenalties: number;
  readonly matches: number;
  readonly homeBias?: number;
}

export interface RefereeStatsProviderPort {
  getRefereeStats(refereeId: RefereeId, season: SeasonId): Promise<Provenanced<RefereeStatsDto>>;
}

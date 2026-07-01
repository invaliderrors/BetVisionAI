// libs/domain/src/ports/player-stats-provider.port.ts
import type { Provenanced, PlayerId, SeasonId } from './shared.dto';

export interface PlayerStatsDto {
  readonly playerId: PlayerId;
  readonly apps: number;
  readonly minutes: number;
  readonly goals: number;
  readonly assists: number;
  readonly xg: number;
  readonly xa: number;
  readonly yellow: number;
  readonly red: number;
}

export interface PlayerStatsProviderPort {
  getPlayerStats(playerId: PlayerId, season: SeasonId): Promise<Provenanced<PlayerStatsDto>>;
}

// libs/domain/src/ports/lineup-provider.port.ts
import type { Provenanced, MatchId, TeamId, PlayerId } from './shared.dto';

export interface LineupDto {
  readonly matchId: MatchId;
  readonly teamId: TeamId;
  readonly formation?: string;
  readonly probableXi: ReadonlyArray<{
    readonly playerId: PlayerId;
    readonly name: string;
    readonly position: string;
  }>;
  readonly confirmed: boolean;
}

export interface LineupProviderPort {
  getProbableLineup(matchId: MatchId): Promise<Provenanced<LineupDto>>;
}

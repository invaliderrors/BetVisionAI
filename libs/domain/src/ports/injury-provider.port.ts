// libs/domain/src/ports/injury-provider.port.ts
import type { Provenanced, TeamId, PlayerId } from './shared.dto';

export interface InjuryDto {
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly status: 'injured' | 'doubtful' | 'suspended';
  readonly expectedReturn?: string; // ISO date when known
}

export interface InjuryProviderPort {
  getInjuries(teamId: TeamId): Promise<Provenanced<InjuryDto[]>>;
}

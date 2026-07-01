// libs/domain/src/ports/sports-data-provider.port.ts
import type { Provenanced, TeamId, MatchId, IsoDateTime } from './shared.dto';

export interface FixtureQuery {
  readonly text: string;
  readonly dateHint?: IsoDateTime;
}
export interface TeamRefDto {
  readonly externalId: string;
  readonly name: string;
  readonly country?: string;
  readonly crestUrl?: string;
}
export interface FixtureDto {
  readonly externalId: string;
  readonly home: TeamRefDto;
  readonly away: TeamRefDto;
  readonly competition: string;
  readonly kickoffUtc: IsoDateTime;
  readonly venue?: string;
}
export interface TeamFormDto {
  readonly teamId: TeamId;
  readonly results: ReadonlyArray<'W' | 'D' | 'L'>; // most-recent first
  readonly goalsFor: number[];
  readonly goalsAgainst: number[];
}
export interface H2HDto {
  readonly meetings: ReadonlyArray<{
    readonly matchId: MatchId;
    readonly kickoffUtc: IsoDateTime;
    readonly homeGoals: number;
    readonly awayGoals: number;
  }>;
}

export interface SportsDataProviderPort {
  getFixture(query: FixtureQuery): Promise<Provenanced<FixtureDto>>;
  getTeamForm(teamId: TeamId, last: number): Promise<Provenanced<TeamFormDto>>;
  getHeadToHead(home: TeamId, away: TeamId): Promise<Provenanced<H2HDto>>;
}

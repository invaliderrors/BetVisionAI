// libs/application/src/teams/search-teams.use-case.ts
// Fuzzy team search (GET /teams?search=). Returns ranked TeamRefs (highest similarity first).
import { Result, ok, DomainError } from '@betvision/shared';
import type { TeamRepositoryPort } from '@betvision/domain';
import type { TeamSearchResponse } from '@betvision/contracts';
import { toTeamRefDto } from './team.mapper';

export interface SearchTeamsCommand {
  readonly query: string;
  readonly limit?: number;
}

export class SearchTeamsUseCase {
  constructor(private readonly teams: TeamRepositoryPort) {}

  async execute(
    command: SearchTeamsCommand,
  ): Promise<Result<TeamSearchResponse, DomainError>> {
    const query = command.query.trim();
    if (query.length === 0) {
      return ok({ query: command.query, teams: [] });
    }
    const results = await this.teams.searchByName(query, command.limit);
    return ok({
      query: command.query,
      teams: results.map((result) => toTeamRefDto(result.team.toRef())),
    });
  }
}

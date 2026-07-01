// libs/domain/src/ports/team-repository.port.ts
// Outbound port for Team persistence + fuzzy name search. Exchanges ONLY domain types;
// the adapter implements `searchByName` with a trigram similarity query (pg_trgm).
import type { TeamId } from './shared.dto';
import type { Team } from '../matches/entities/team.entity';
import type { TeamStatsView } from '../matches/read-models';

/** A team matched by fuzzy name search, carrying its similarity score in [0,1]. */
export interface TeamSearchResult {
  readonly team: Team;
  readonly score: number;
}

export interface TeamRepositoryPort {
  findById(id: TeamId): Promise<Team | null>;
  /** Fuzzy name search ranked by trigram similarity (highest score first). */
  searchByName(name: string, limit?: number): Promise<TeamSearchResult[]>;
  /** Rolling stats rows for a team (may be empty until computed by jobs). */
  findStats(id: TeamId): Promise<TeamStatsView[]>;
}

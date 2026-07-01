// libs/domain/src/ports/match-repository.port.ts
import type { MatchId, CompetitionId, IsoDateTime } from './shared.dto';
// Match / OddsSnapshot / Prediction / AnalysisReport are domain ENTITIES defined in
// libs/domain/src/<context>/entities. Referenced here as their entity types.
import type { Match } from '../matches/entities/match.entity';

export interface MatchSearchQuery {
  readonly text: string; // free-text fixture, e.g. "Real Madrid vs Barcelona"
  readonly competitionId?: CompetitionId;
  readonly dateFrom?: IsoDateTime;
  readonly dateTo?: IsoDateTime;
  readonly limit?: number;
}

export interface MatchCandidate {
  readonly matchId: MatchId;
  readonly homeName: string;
  readonly awayName: string;
  readonly competition: string;
  readonly kickoffUtc: IsoDateTime;
  readonly confidence: number; // resolver confidence 0..1
}

export interface MatchRepositoryPort {
  findById(id: MatchId): Promise<Match | null>;
  search(query: MatchSearchQuery): Promise<MatchCandidate[]>;
  save(match: Match): Promise<void>;
}

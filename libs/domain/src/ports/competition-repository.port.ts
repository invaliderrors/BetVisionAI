// libs/domain/src/ports/competition-repository.port.ts
// Outbound port for Competition + Season reads. Exchanges ONLY domain entities.
import type { CompetitionId } from './shared.dto';
import type { Competition } from '../matches/entities/competition.entity';
import type { Season } from '../matches/entities/season.entity';

export interface CompetitionRepositoryPort {
  findById(id: CompetitionId): Promise<Competition | null>;
  /** All competitions, ordered by tier then name (small, near-static catalog). */
  list(): Promise<Competition[]>;
  /** Seasons belonging to a competition, newest first. Empty if the competition is unknown. */
  findSeasons(competitionId: CompetitionId): Promise<Season[]>;
}

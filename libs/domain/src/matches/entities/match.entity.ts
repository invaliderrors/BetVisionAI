// libs/domain/src/matches/entities/match.entity.ts
// Match aggregate root. Identity + the football fixture facts the write model owns:
// the competition/season it belongs to, the two participating TEAMS (by id — never by
// name), kickoff, and lifecycle status. Team/competition NAMES are display concerns and
// live on the read models (MatchDetailView / MatchCandidate), never on the aggregate.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import { AggregateRoot } from '../../base/entity';
import type {
  MatchId,
  TeamId,
  CompetitionId,
  SeasonId,
  IsoDateTime,
} from '../../ports/shared.dto';
import type { MatchStatus } from '../match-status';

export interface MatchProps {
  readonly id: MatchId;
  readonly competitionId: CompetitionId;
  readonly seasonId: SeasonId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly kickoffUtc: IsoDateTime;
  readonly status: MatchStatus;
  readonly venue: string | null;
  readonly round: string | null;
  readonly importance: number | null;
}

/** Inputs to schedule a brand-new fixture (status defaults to `scheduled`). */
export interface CreateMatchProps {
  readonly id: MatchId;
  readonly competitionId: CompetitionId;
  readonly seasonId: SeasonId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly kickoffUtc: IsoDateTime;
  readonly status?: MatchStatus;
  readonly venue?: string | null;
  readonly round?: string | null;
  readonly importance?: number | null;
}

export class Match extends AggregateRoot<MatchId> {
  private constructor(private readonly props: MatchProps) {
    super(props.id);
  }

  /**
   * Create a new fixture. The only cross-field invariant the aggregate defends is that a
   * team cannot play itself; all FK existence is enforced by the persistence adapter.
   */
  static create(props: CreateMatchProps): Result<Match, DomainError> {
    if (props.homeTeamId === props.awayTeamId) {
      return err(DomainError.of(DomainErrorCode.MATCH_TEAMS_IDENTICAL));
    }
    return ok(
      new Match({
        id: props.id,
        competitionId: props.competitionId,
        seasonId: props.seasonId,
        homeTeamId: props.homeTeamId,
        awayTeamId: props.awayTeamId,
        kickoffUtc: props.kickoffUtc,
        status: props.status ?? 'scheduled',
        venue: props.venue ?? null,
        round: props.round ?? null,
        importance: props.importance ?? null,
      }),
    );
  }

  /** Rehydrate an already-persisted (and therefore valid) fixture. No re-validation. */
  static fromPersistence(props: MatchProps): Match {
    return new Match(props);
  }

  get competitionId(): CompetitionId {
    return this.props.competitionId;
  }

  get seasonId(): SeasonId {
    return this.props.seasonId;
  }

  get homeTeamId(): TeamId {
    return this.props.homeTeamId;
  }

  get awayTeamId(): TeamId {
    return this.props.awayTeamId;
  }

  get kickoffUtc(): IsoDateTime {
    return this.props.kickoffUtc;
  }

  get status(): MatchStatus {
    return this.props.status;
  }

  get venue(): string | null {
    return this.props.venue;
  }

  get round(): string | null {
    return this.props.round;
  }

  get importance(): number | null {
    return this.props.importance;
  }
}

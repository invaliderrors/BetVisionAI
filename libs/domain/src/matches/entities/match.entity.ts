// libs/domain/src/matches/entities/match.entity.ts
// Minimal Match aggregate — enough for the repository port contract in Phase 3.
// The full aggregate (stats, referee, odds summary) is fleshed out in Phase 6.

import { Result, ok, err, DomainError, Guard } from '@betvision/shared';
import { AggregateRoot } from '../../base/entity';
import type { MatchId, CompetitionId, IsoDateTime } from '../../ports/shared.dto';

export interface MatchProps {
  readonly id: MatchId;
  readonly homeName: string;
  readonly awayName: string;
  readonly competitionId: CompetitionId;
  readonly competition: string;
  readonly kickoffUtc: IsoDateTime;
}

export class Match extends AggregateRoot<MatchId> {
  private constructor(private readonly props: MatchProps) {
    super(props.id);
  }

  static create(props: MatchProps): Result<Match, DomainError> {
    const error = Guard.firstError(
      props.homeName.trim().length > 0 ? null : DomainError.of('domain.match.home_name_required'),
      props.awayName.trim().length > 0 ? null : DomainError.of('domain.match.away_name_required'),
    );
    return error ? err(error) : ok(new Match(props));
  }

  get homeName(): string {
    return this.props.homeName;
  }

  get awayName(): string {
    return this.props.awayName;
  }

  get competitionId(): CompetitionId {
    return this.props.competitionId;
  }

  get competition(): string {
    return this.props.competition;
  }

  get kickoffUtc(): IsoDateTime {
    return this.props.kickoffUtc;
  }

  /** Canonical human label, e.g. "Real Madrid vs Barcelona". */
  get label(): string {
    return `${this.props.homeName} vs ${this.props.awayName}`;
  }
}

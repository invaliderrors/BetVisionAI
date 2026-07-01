// libs/domain/src/matches/entities/team.entity.ts
// Team entity: identity + descriptive attributes. Fuzzy name search + relations live in
// the repository port; the entity only guards its own invariants (a non-empty name).
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import { Entity } from '../../base/entity';
import type { TeamId } from '../../ports/shared.dto';
import type { TeamRef } from '../read-models';

export interface TeamProps {
  readonly id: TeamId;
  readonly name: string;
  readonly shortName: string | null;
  readonly country: string | null;
  readonly crestUrl: string | null;
  readonly eloRating: number | null;
}

export class Team extends Entity<TeamId> {
  private constructor(private readonly props: TeamProps) {
    super(props.id);
  }

  static create(props: TeamProps): Result<Team, DomainError> {
    if (props.name.trim().length === 0) {
      return err(DomainError.of(DomainErrorCode.TEAM_NAME_REQUIRED));
    }
    return ok(new Team(props));
  }

  static fromPersistence(props: TeamProps): Team {
    return new Team(props);
  }

  get name(): string {
    return this.props.name;
  }

  get shortName(): string | null {
    return this.props.shortName;
  }

  get country(): string | null {
    return this.props.country;
  }

  get crestUrl(): string | null {
    return this.props.crestUrl;
  }

  get eloRating(): number | null {
    return this.props.eloRating;
  }

  /** Lightweight projection embedded in match candidates / detail. */
  toRef(): TeamRef {
    return {
      id: this.id,
      name: this.props.name,
      shortName: this.props.shortName,
      crestUrl: this.props.crestUrl,
    };
  }
}

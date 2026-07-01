// libs/domain/src/matches/entities/competition.entity.ts
// Competition entity. `type` is a lowercase domain union mapped to the Prisma
// `CompetitionType` enum at the persistence boundary.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import { Entity } from '../../base/entity';
import type { CompetitionId } from '../../ports/shared.dto';
import type { CompetitionRef } from '../read-models';

export const COMPETITION_TYPES = ['league', 'cup', 'ucl', 'friendly'] as const;
export type CompetitionType = (typeof COMPETITION_TYPES)[number];

export interface CompetitionProps {
  readonly id: CompetitionId;
  readonly name: string;
  readonly country: string | null;
  readonly type: CompetitionType;
  readonly tier: number | null;
}

export class Competition extends Entity<CompetitionId> {
  private constructor(private readonly props: CompetitionProps) {
    super(props.id);
  }

  static create(props: CompetitionProps): Result<Competition, DomainError> {
    if (props.name.trim().length === 0) {
      return err(DomainError.of(DomainErrorCode.COMPETITION_NAME_REQUIRED));
    }
    return ok(new Competition(props));
  }

  static fromPersistence(props: CompetitionProps): Competition {
    return new Competition(props);
  }

  get name(): string {
    return this.props.name;
  }

  get country(): string | null {
    return this.props.country;
  }

  get type(): CompetitionType {
    return this.props.type;
  }

  get tier(): number | null {
    return this.props.tier;
  }

  toRef(): CompetitionRef {
    return { id: this.id, name: this.props.name, country: this.props.country };
  }
}

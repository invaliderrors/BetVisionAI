// libs/domain/src/matches/entities/season.entity.ts
// Season entity: a competition's edition (e.g. "2025/26"). A Match belongs to exactly one.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import { Entity } from '../../base/entity';
import type { SeasonId, CompetitionId, IsoDateTime } from '../../ports/shared.dto';

export interface SeasonProps {
  readonly id: SeasonId;
  readonly competitionId: CompetitionId;
  readonly label: string;
  readonly startDate: IsoDateTime | null;
  readonly endDate: IsoDateTime | null;
}

export class Season extends Entity<SeasonId> {
  private constructor(private readonly props: SeasonProps) {
    super(props.id);
  }

  static create(props: SeasonProps): Result<Season, DomainError> {
    if (props.label.trim().length === 0) {
      return err(DomainError.of(DomainErrorCode.SEASON_LABEL_REQUIRED));
    }
    return ok(new Season(props));
  }

  static fromPersistence(props: SeasonProps): Season {
    return new Season(props);
  }

  get competitionId(): CompetitionId {
    return this.props.competitionId;
  }

  get label(): string {
    return this.props.label;
  }

  get startDate(): IsoDateTime | null {
    return this.props.startDate;
  }

  get endDate(): IsoDateTime | null {
    return this.props.endDate;
  }
}

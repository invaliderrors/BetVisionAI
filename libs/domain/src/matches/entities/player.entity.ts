// libs/domain/src/matches/entities/player.entity.ts
// Player entity. Minimal for Phase 6 (no player endpoints yet); modelled now so the Team
// aggregate + future lineup/stat phases have a canonical identity to hang off of.
import { Result, ok, err, DomainError, DomainErrorCode } from '@betvision/shared';
import { Entity } from '../../base/entity';
import type { PlayerId, TeamId } from '../../ports/shared.dto';

export interface PlayerProps {
  readonly id: PlayerId;
  readonly teamId: TeamId | null;
  readonly name: string;
  readonly position: string | null;
  readonly nationality: string | null;
}

export class Player extends Entity<PlayerId> {
  private constructor(private readonly props: PlayerProps) {
    super(props.id);
  }

  static create(props: PlayerProps): Result<Player, DomainError> {
    if (props.name.trim().length === 0) {
      return err(DomainError.of(DomainErrorCode.PLAYER_NAME_REQUIRED));
    }
    return ok(new Player(props));
  }

  static fromPersistence(props: PlayerProps): Player {
    return new Player(props);
  }

  get teamId(): TeamId | null {
    return this.props.teamId;
  }

  get name(): string {
    return this.props.name;
  }

  get position(): string | null {
    return this.props.position;
  }

  get nationality(): string | null {
    return this.props.nationality;
  }
}

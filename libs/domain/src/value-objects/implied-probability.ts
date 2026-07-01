// libs/domain/src/value-objects/implied-probability.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard, invariant } from '@betvision/shared';
import type { Odds } from './odds';

/**
 * Probability implied by market odds. Distinct from Probability because it tracks
 * whether the bookmaker margin (overround) has been removed — a fair baseline for `Edge`.
 */
export class ImpliedProbability {
  private constructor(
    readonly value: number,
    readonly marginRemoved: boolean,
  ) {
    Object.freeze(this);
  }

  static create(value: number, marginRemoved: boolean): Result<ImpliedProbability, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'impliedProbability'),
      Guard.inClosedRange(
        value,
        0,
        1,
        DomainErrorCode.IMPLIED_PROBABILITY_OUT_OF_RANGE,
        'impliedProbability',
      ),
    );
    return error ? err(error) : ok(new ImpliedProbability(value, marginRemoved));
  }

  /** Internal: odds.decimal > 1 guarantees (0,1); construction is infallible here. */
  static fromOdds(odds: Odds): ImpliedProbability {
    const v = 1 / odds.decimal;
    invariant(v > 0 && v < 1, 'implied prob from odds must be in (0,1)');
    return new ImpliedProbability(v, false);
  }
}

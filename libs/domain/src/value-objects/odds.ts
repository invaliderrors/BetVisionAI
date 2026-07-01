// libs/domain/src/value-objects/odds.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import { ImpliedProbability } from './implied-probability';

/** Decimal (European) odds, strictly greater than 1.0. */
export class Odds {
  private constructor(readonly decimal: number) {
    Object.freeze(this);
  }

  static create(decimal: number): Result<Odds, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(decimal, 'odds'),
      Guard.greaterThan(decimal, 1, DomainErrorCode.ODDS_NOT_GREATER_THAN_ONE, 'odds'),
    );
    return error ? err(error) : ok(new Odds(decimal));
  }

  /** Raw 1/odds implied probability — bookmaker margin still included (marginRemoved=false). */
  toImpliedProbability(): ImpliedProbability {
    // value is always within (0,1) because decimal > 1, so this cannot fail.
    return ImpliedProbability.fromOdds(this);
  }

  /** Net profit multiple on a 1-unit win (odds - 1). */
  get netReturn(): number {
    return this.decimal - 1;
  }
}

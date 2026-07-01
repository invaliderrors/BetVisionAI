// libs/domain/src/value-objects/expected-value.ts
import { Result, ok, err, DomainError, Guard } from '@betvision/shared';
import type { Probability } from './probability';
import type { Odds } from './odds';

/** Expected value per 1 unit staked. Can be negative; not range-bounded beyond finiteness. */
export class ExpectedValue {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<ExpectedValue, DomainError> {
    const error = Guard.finiteNumber(value, 'expectedValue');
    return error ? err(error) : ok(new ExpectedValue(value));
  }

  /** EV = p*(odds-1) - (1-p). Reference formula from SPEC §14. */
  static of(model: Probability, odds: Odds): Result<ExpectedValue, DomainError> {
    const p = model.value;
    return ExpectedValue.create(p * (odds.decimal - 1) - (1 - p));
  }

  get isPositive(): boolean {
    return this.value > 0;
  }
}

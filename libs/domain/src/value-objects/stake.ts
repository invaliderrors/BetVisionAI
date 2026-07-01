// libs/domain/src/value-objects/stake.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import type { Money } from './money';

/**
 * Suggested stake expressed as a FRACTION OF BANKROLL in [0, 1].
 * Conservative-by-design: produced only via KellyStakeService (fractional Kelly + hard cap).
 * `0` is a valid, common value (gated out / below threshold).
 */
export class Stake {
  private constructor(readonly bankrollFraction: number) {
    Object.freeze(this);
  }

  static create(bankrollFraction: number): Result<Stake, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(bankrollFraction, 'stake'),
      Guard.inClosedRange(bankrollFraction, 0, 1, DomainErrorCode.STAKE_OUT_OF_RANGE, 'stake'),
    );
    return error ? err(error) : ok(new Stake(bankrollFraction));
  }

  /** Enforce the profile's hard cap. Returns an error if the raw size exceeds the cap. */
  static capped(rawFraction: number, maxStakePctCap: number): Result<Stake, DomainError> {
    if (rawFraction > maxStakePctCap) {
      return err(DomainError.of(DomainErrorCode.STAKE_EXCEEDS_CAP, { rawFraction, maxStakePctCap }));
    }
    return Stake.create(rawFraction);
  }

  static zero(): Stake {
    return new Stake(0);
  }

  get pct(): number {
    return this.bankrollFraction * 100;
  }

  /** Materialize against a concrete bankroll (purely derived; no side effects). */
  appliedTo(bankroll: Money): Money {
    return bankroll.scale(this.bankrollFraction);
  }
}

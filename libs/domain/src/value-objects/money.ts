// libs/domain/src/value-objects/money.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard, invariant } from '@betvision/shared';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP'; // extend via config; ISO-4217.

/** Money stored as integer MINOR units (cents) to avoid float drift. */
export class Money {
  private constructor(
    readonly minorUnits: number,
    readonly currency: CurrencyCode,
  ) {
    Object.freeze(this);
  }

  static fromMinor(minorUnits: number, currency: CurrencyCode): Result<Money, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(minorUnits, 'money'),
      Guard.isInteger(minorUnits, DomainErrorCode.MONEY_INVALID_AMOUNT, 'money'),
    );
    return error ? err(error) : ok(new Money(minorUnits, currency));
  }

  static fromMajor(amount: number, currency: CurrencyCode): Result<Money, DomainError> {
    return Money.fromMinor(Math.round(amount * 100), currency);
  }

  /** Scale by a unit-less fraction (e.g. a Stake). Rounds to nearest minor unit. */
  scale(fraction: number): Money {
    return new Money(Math.round(this.minorUnits * fraction), this.currency);
  }

  add(other: Money): Money {
    invariant(other.currency === this.currency, 'currency mismatch in Money.add');
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  get major(): number {
    return this.minorUnits / 100;
  }
}

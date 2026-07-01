// libs/domain/src/value-objects/probability.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';

/** Calibrated model probability in the closed interval [0, 1]. */
export class Probability {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<Probability, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'probability'),
      Guard.inClosedRange(value, 0, 1, DomainErrorCode.PROBABILITY_OUT_OF_RANGE, 'probability'),
    );
    return error ? err(error) : ok(new Probability(value));
  }

  complement(): Probability {
    return new Probability(1 - this.value);
  }

  equals(other: Probability): boolean {
    return Math.abs(this.value - other.value) < Number.EPSILON;
  }
}

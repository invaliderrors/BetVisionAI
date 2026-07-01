// libs/shared/src/guard.ts
// Two complementary tools:
//  - `Guard.*` returns `DomainError | null` for EXPECTED validation (compose into Result factories).
//  - `invariant(...)` throws for IMPOSSIBLE states (defense in depth inside already-valid VOs).

import { DomainError, DomainErrorCode, ErrorParams, InvariantViolationError } from './domain-error';

export type GuardResult = DomainError | null;

export const Guard = {
  finiteNumber(value: number, field: string): GuardResult {
    return Number.isFinite(value)
      ? null
      : DomainError.of(DomainErrorCode.NOT_FINITE_NUMBER, { field });
  },

  inClosedRange(value: number, min: number, max: number, code: string, field: string): GuardResult {
    return value >= min && value <= max
      ? null
      : DomainError.of(code, { field, value, min, max });
  },

  greaterThan(value: number, bound: number, code: string, field: string): GuardResult {
    return value > bound ? null : DomainError.of(code, { field, value, bound });
  },

  isInteger(value: number, code: string, field: string): GuardResult {
    return Number.isInteger(value) ? null : DomainError.of(code, { field, value });
  },

  /** Returns the first non-null guard, or null if all pass. */
  firstError(...checks: GuardResult[]): GuardResult {
    for (const c of checks) if (c !== null) return c;
    return null;
  },
} as const;

/** Hard assertion for impossible states. Use sparingly; never for user input. */
export function invariant(
  condition: unknown,
  message: string,
  _params?: ErrorParams,
): asserts condition {
  if (!condition) throw new InvariantViolationError(message);
}

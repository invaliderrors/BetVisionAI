// libs/shared/src/result.ts
// A total, allocation-cheap result type. Domain factories and use cases return this
// instead of throwing for *expected* failures (validation, not-found, gating).

import { DomainError, InvariantViolationError } from './domain-error';

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

/** Map the success channel; pass errors through untouched. */
export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

/** Monadic chain for composing fallible steps without nested ifs. */
export const flatMap = <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> =>
  r.ok ? f(r.value) : r;

/** Collect a list of results into a result of a list (fails on the first error). */
export const all = <T, E>(rs: ReadonlyArray<Result<T, E>>): Result<T[], E> => {
  const out: T[] = [];
  for (const r of rs) {
    if (!r.ok) return r;
    out.push(r.value);
  }
  return ok(out);
};

/** Escape hatch for call sites that have already proven success. */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new InvariantViolationError(
    `unwrap() on Err: ${JSON.stringify((r as { error: unknown }).error)}`,
  );
};

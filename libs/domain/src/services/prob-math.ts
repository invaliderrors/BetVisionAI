// libs/domain/src/services/prob-math.ts
// Small, dependency-free numeric primitives shared by the statistical prediction engine
// (Phase 10). PURE: no framework/vendor/node imports, no randomness, no clock.

/** Clamp a number into the closed probability interval [0, 1]. */
export const clamp01 = (value: number): number =>
  !Number.isFinite(value) ? 0 : value < 0 ? 0 : value > 1 ? 1 : value;

/** n! for small non-negative integers (goal counts). Returns 1 for n <= 1. */
export function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Poisson probability mass P(X = k) for rate `lambda`. Guards against invalid input
 * (negative k/lambda, non-finite lambda) by returning 0 so callers never propagate NaN.
 */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (!Number.isFinite(lambda) || lambda < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Logistic sigmoid 1 / (1 + e^-x). */
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Logit ln(p / (1-p)) with a tiny epsilon guard so p∈{0,1} stays finite. */
export function logit(p: number): number {
  const eps = 1e-9;
  const clamped = Math.min(1 - eps, Math.max(eps, p));
  return Math.log(clamped / (1 - clamped));
}

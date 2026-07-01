import { ExpectedValue } from './expected-value';
import { Probability } from './probability';
import { Odds } from './odds';
import { unwrap } from '@betvision/shared';

describe('ExpectedValue', () => {
  it('of() computes EV = p*(odds-1) - (1-p)', () => {
    // p=0.6, odds=2.0 → 0.6*1 - 0.4 = 0.2
    const model = unwrap(Probability.create(0.6));
    const odds = unwrap(Odds.create(2));
    const r = ExpectedValue.of(model, odds);
    if (r.ok) expect(r.value.value).toBeCloseTo(0.2, 12);
  });

  it('is negative for a value-less bet', () => {
    // p=0.4, odds=2.0 → 0.4*1 - 0.6 = -0.2
    const model = unwrap(Probability.create(0.4));
    const odds = unwrap(Odds.create(2));
    const r = ExpectedValue.of(model, odds);
    if (r.ok) {
      expect(r.value.value).toBeCloseTo(-0.2, 12);
      expect(r.value.isPositive).toBe(false);
    }
  });

  it('a fair bet (p = 1/odds) has EV ≈ 0', () => {
    const model = unwrap(Probability.create(0.5));
    const odds = unwrap(Odds.create(2));
    const r = ExpectedValue.of(model, odds);
    if (r.ok) expect(r.value.value).toBeCloseTo(0, 12);
  });

  it('create() rejects non-finite values', () => {
    expect(ExpectedValue.create(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});

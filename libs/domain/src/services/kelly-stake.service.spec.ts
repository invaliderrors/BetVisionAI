import { DefaultKellyStakeService } from './kelly-stake.service';
import { Odds } from '../value-objects/odds';
import { Probability } from '../value-objects/probability';
import { unwrap } from '@betvision/shared';

describe('DefaultKellyStakeService', () => {
  const svc = new DefaultKellyStakeService();

  it('returns zero stake for a non-positive edge', () => {
    // p=0.4, odds=2.0 → fullKelly negative
    const r = svc.fractionalKelly({
      model: unwrap(Probability.create(0.4)),
      odds: unwrap(Odds.create(2)),
      kellyFraction: 0.5,
      maxStakePctCap: 0.03,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.bankrollFraction).toBe(0);
  });

  it('applies only a fraction of full Kelly', () => {
    // p=0.6, odds=2.0 → b=1, fullKelly=(0.6-0.4)/1=0.2; *0.25 = 0.05, capped at 0.02.
    const r = svc.fractionalKelly({
      model: unwrap(Probability.create(0.6)),
      odds: unwrap(Odds.create(2)),
      kellyFraction: 0.25,
      maxStakePctCap: 0.5, // high cap so we observe the fraction, not the cap
    });
    if (r.ok) expect(r.value.bankrollFraction).toBeCloseTo(0.05, 12);
  });

  it('NEVER exceeds the maxStakePctCap (property: clamp to cap)', () => {
    // fullKelly=0.2, *0.5 = 0.1, but cap = 0.03 → must clamp to 0.03.
    const r = svc.fractionalKelly({
      model: unwrap(Probability.create(0.6)),
      odds: unwrap(Odds.create(2)),
      kellyFraction: 0.5,
      maxStakePctCap: 0.03,
    });
    if (r.ok) expect(r.value.bankrollFraction).toBe(0.03);
  });

  it('holds the cap invariant across many random inputs', () => {
    for (let i = 0; i < 200; i++) {
      const p = Math.random();
      const decimal = 1 + Math.random() * 10;
      const kf = 0.1 + Math.random() * 0.4; // (0,1)
      const cap = 0.005 + Math.random() * 0.05;
      const r = svc.fractionalKelly({
        model: unwrap(Probability.create(p)),
        odds: unwrap(Odds.create(decimal)),
        kellyFraction: kf,
        maxStakePctCap: cap,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.bankrollFraction).toBeGreaterThanOrEqual(0);
        expect(r.value.bankrollFraction).toBeLessThanOrEqual(cap);
      }
    }
  });
});

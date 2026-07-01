import { DefaultValueCalculator } from './value-calculator.service';
import { Odds } from '../value-objects/odds';
import { Probability } from '../value-objects/probability';
import { unwrap } from '@betvision/shared';

describe('DefaultValueCalculator', () => {
  const calc = new DefaultValueCalculator();

  it('impliedProbability returns 1/decimal with margin included', () => {
    const ip = calc.impliedProbability(unwrap(Odds.create(4)));
    expect(ip.value).toBeCloseTo(0.25, 12);
    expect(ip.marginRemoved).toBe(false);
  });

  it('removeMargin normalizes implied probabilities to sum to 1', () => {
    // Two-way market, both at 1.90 → raw implied 0.5263 each, overround ≈ 1.0526.
    const market = [unwrap(Odds.create(1.9)), unwrap(Odds.create(1.9))];
    const fair = calc.removeMargin(market);
    const sum = fair.reduce((s, ip) => s + ip.value, 0);
    expect(sum).toBeCloseTo(1, 10);
    for (const ip of fair) {
      expect(ip.value).toBeCloseTo(0.5, 10);
      expect(ip.marginRemoved).toBe(true);
    }
  });

  it('edge = modelProb - impliedProb', () => {
    const model = unwrap(Probability.create(0.6));
    const implied = unwrap(Odds.create(2)).toImpliedProbability(); // 0.5
    const r = calc.edge(model, implied);
    if (r.ok) expect(r.value.value).toBeCloseTo(0.1, 12);
  });

  it('expectedValue = p*(odds-1) - (1-p)', () => {
    const model = unwrap(Probability.create(0.55));
    const odds = unwrap(Odds.create(2));
    const r = calc.expectedValue(model, odds);
    if (r.ok) expect(r.value.value).toBeCloseTo(0.1, 12); // 0.55 - 0.45
  });
});

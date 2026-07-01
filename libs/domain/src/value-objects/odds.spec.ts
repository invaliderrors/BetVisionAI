import { Odds } from './odds';
import { ImpliedProbability } from './implied-probability';
import { DomainErrorCode } from '@betvision/shared';

describe('Odds', () => {
  it('accepts decimals strictly greater than 1', () => {
    const r = Odds.create(2.5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.decimal).toBe(2.5);
  });

  it('rejects decimals equal to 1', () => {
    const r = Odds.create(1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.ODDS_NOT_GREATER_THAN_ONE);
  });

  it('rejects decimals below 1', () => {
    const r = Odds.create(0.9);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.ODDS_NOT_GREATER_THAN_ONE);
  });

  it('netReturn is decimal - 1', () => {
    const r = Odds.create(3);
    if (r.ok) expect(r.value.netReturn).toBe(2);
  });

  it('toImpliedProbability returns 1/decimal with margin still included', () => {
    const r = Odds.create(4);
    if (r.ok) {
      const ip = r.value.toImpliedProbability();
      expect(ip).toBeInstanceOf(ImpliedProbability);
      expect(ip.value).toBeCloseTo(0.25, 12);
      expect(ip.marginRemoved).toBe(false);
    }
  });
});

describe('ImpliedProbability', () => {
  it('rejects values out of [0,1]', () => {
    const r = ImpliedProbability.create(1.2, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.IMPLIED_PROBABILITY_OUT_OF_RANGE);
  });

  it('tracks the marginRemoved flag', () => {
    const raw = ImpliedProbability.create(0.5, false);
    const fair = ImpliedProbability.create(0.5, true);
    if (raw.ok) expect(raw.value.marginRemoved).toBe(false);
    if (fair.ok) expect(fair.value.marginRemoved).toBe(true);
  });
});

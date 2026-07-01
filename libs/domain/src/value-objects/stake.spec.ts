import { Stake } from './stake';
import { Money } from './money';
import { DomainErrorCode, unwrap } from '@betvision/shared';

describe('Stake', () => {
  it('accepts a bankroll fraction within [0, 1]', () => {
    for (const v of [0, 0.01, 0.5, 1]) {
      expect(Stake.create(v).ok).toBe(true);
    }
  });

  it('rejects fractions outside [0, 1]', () => {
    const r = Stake.create(1.5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.STAKE_OUT_OF_RANGE);
  });

  it('zero() is a valid 0 stake', () => {
    expect(Stake.zero().bankrollFraction).toBe(0);
  });

  it('pct converts to a percentage', () => {
    expect(unwrap(Stake.create(0.025)).pct).toBeCloseTo(2.5, 12);
  });

  describe('capped()', () => {
    it('succeeds when raw fraction is within the cap', () => {
      const r = Stake.capped(0.008, 0.01);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.bankrollFraction).toBe(0.008);
    });

    it('succeeds exactly at the cap (never exceeds it)', () => {
      const r = Stake.capped(0.01, 0.01);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.bankrollFraction).toBe(0.01);
    });

    it('rejects raw fractions above the cap', () => {
      const r = Stake.capped(0.02, 0.01);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.STAKE_EXCEEDS_CAP);
    });
  });

  it('appliedTo(bankroll) scales money by the fraction', () => {
    const bankroll = unwrap(Money.fromMajor(1000, 'EUR')); // 100000 minor
    const stake = unwrap(Stake.create(0.02));
    const applied = stake.appliedTo(bankroll);
    expect(applied.minorUnits).toBe(2000); // 2% of 100000
    expect(applied.currency).toBe('EUR');
  });
});

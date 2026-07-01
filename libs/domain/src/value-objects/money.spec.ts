import { Money } from './money';
import { DomainErrorCode, unwrap } from '@betvision/shared';

describe('Money', () => {
  it('fromMinor stores integer minor units', () => {
    const r = Money.fromMinor(150, 'USD');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.minorUnits).toBe(150);
      expect(r.value.major).toBe(1.5);
    }
  });

  it('fromMinor rejects non-integer minor units', () => {
    const r = Money.fromMinor(1.5, 'USD');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.MONEY_INVALID_AMOUNT);
  });

  it('fromMajor rounds to nearest minor unit', () => {
    const r = Money.fromMajor(9.999, 'EUR');
    if (r.ok) expect(r.value.minorUnits).toBe(1000);
  });

  it('scale rounds to nearest minor unit', () => {
    const m = unwrap(Money.fromMinor(1005, 'GBP'));
    expect(m.scale(0.5).minorUnits).toBe(503); // 502.5 → 503
  });

  it('add sums same-currency amounts', () => {
    const a = unwrap(Money.fromMinor(100, 'EUR'));
    const b = unwrap(Money.fromMinor(250, 'EUR'));
    expect(a.add(b).minorUnits).toBe(350);
  });

  it('add throws on currency mismatch (invariant)', () => {
    const a = unwrap(Money.fromMinor(100, 'EUR'));
    const b = unwrap(Money.fromMinor(250, 'USD'));
    expect(() => a.add(b)).toThrow();
  });
});

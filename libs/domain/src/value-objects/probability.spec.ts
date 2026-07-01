import { Probability } from './probability';
import { DomainErrorCode } from '@betvision/shared';

describe('Probability', () => {
  it('accepts values within [0, 1] including boundaries', () => {
    for (const v of [0, 0.5, 1]) {
      const r = Probability.create(v);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.value).toBe(v);
    }
  });

  it('rejects values below 0', () => {
    const r = Probability.create(-0.0001);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.PROBABILITY_OUT_OF_RANGE);
  });

  it('rejects values above 1', () => {
    const r = Probability.create(1.0001);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.PROBABILITY_OUT_OF_RANGE);
  });

  it('rejects non-finite values', () => {
    const r = Probability.create(Number.NaN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(DomainErrorCode.NOT_FINITE_NUMBER);
  });

  it('complement() returns 1 - value', () => {
    const r = Probability.create(0.3);
    if (r.ok) expect(r.value.complement().value).toBeCloseTo(0.7, 12);
  });

  it('equals() compares by value within epsilon', () => {
    const a = Probability.create(0.42);
    const b = Probability.create(0.42);
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });

  it('is frozen (immutable)', () => {
    const r = Probability.create(0.5);
    if (r.ok) expect(Object.isFrozen(r.value)).toBe(true);
  });
});

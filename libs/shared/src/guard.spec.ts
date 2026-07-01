import { Guard, invariant } from './guard';
import { DomainError, DomainErrorCode, InvariantViolationError } from './domain-error';

describe('Guard', () => {
  it('finiteNumber() rejects NaN / Infinity', () => {
    expect(Guard.finiteNumber(1, 'f')).toBeNull();
    expect(Guard.finiteNumber(Number.NaN, 'f')).toBeInstanceOf(DomainError);
    expect(Guard.finiteNumber(Number.POSITIVE_INFINITY, 'f')).toBeInstanceOf(DomainError);
  });

  it('inClosedRange() accepts boundaries and rejects outside', () => {
    const code = DomainErrorCode.PROBABILITY_OUT_OF_RANGE;
    expect(Guard.inClosedRange(0, 0, 1, code, 'p')).toBeNull();
    expect(Guard.inClosedRange(1, 0, 1, code, 'p')).toBeNull();
    const e = Guard.inClosedRange(1.5, 0, 1, code, 'p');
    expect(e).toBeInstanceOf(DomainError);
    expect(e?.code).toBe(code);
    expect(e?.params).toMatchObject({ field: 'p', value: 1.5, min: 0, max: 1 });
  });

  it('greaterThan() is strict', () => {
    const code = DomainErrorCode.ODDS_NOT_GREATER_THAN_ONE;
    expect(Guard.greaterThan(1.01, 1, code, 'o')).toBeNull();
    expect(Guard.greaterThan(1, 1, code, 'o')).toBeInstanceOf(DomainError);
  });

  it('isInteger() rejects fractional values', () => {
    const code = DomainErrorCode.RISK_APPETITE_NOT_INTEGER;
    expect(Guard.isInteger(5, code, 'r')).toBeNull();
    expect(Guard.isInteger(5.5, code, 'r')).toBeInstanceOf(DomainError);
  });

  it('firstError() returns the first failing guard, else null', () => {
    expect(Guard.firstError(null, null)).toBeNull();
    const e = DomainError.of('boom');
    expect(Guard.firstError(null, e, DomainError.of('second'))).toBe(e);
  });
});

describe('invariant', () => {
  it('passes through when condition is truthy', () => {
    expect(() => invariant(true, 'ok')).not.toThrow();
  });

  it('throws InvariantViolationError when condition is falsy', () => {
    expect(() => invariant(false, 'impossible')).toThrow(InvariantViolationError);
  });
});

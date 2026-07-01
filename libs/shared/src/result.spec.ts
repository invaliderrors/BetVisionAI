import { ok, err, isOk, isErr, map, flatMap, all, unwrap } from './result';
import { DomainError, InvariantViolationError } from './domain-error';

describe('Result', () => {
  it('ok() carries the value and reports success', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err() carries the error and reports failure', () => {
    const e = DomainError.of('x.boom');
    const r = err(e);
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (!r.ok) expect(r.error).toBe(e);
  });

  it('map() transforms the success channel and passes errors through', () => {
    expect(map(ok(2), (n) => n * 3)).toEqual(ok(6));
    const e = err(DomainError.of('x'));
    expect(map(e, (n: number) => n * 3)).toBe(e);
  });

  it('flatMap() chains fallible steps and short-circuits on error', () => {
    const half = (n: number) =>
      n % 2 === 0 ? ok(n / 2) : err(DomainError.of('odd'));
    expect(flatMap(ok(8), half)).toEqual(ok(4));
    expect(flatMap(ok(7), half)).toEqual(err(DomainError.of('odd')));
    const upstream = err<DomainError>(DomainError.of('upstream'));
    expect(flatMap(upstream, half)).toBe(upstream);
  });

  it('all() collects successes and fails on the first error', () => {
    expect(all([ok(1), ok(2), ok(3)])).toEqual(ok([1, 2, 3]));
    const bad = err(DomainError.of('bad'));
    expect(all([ok(1), bad, ok(3)])).toBe(bad);
  });

  it('unwrap() returns the value on success', () => {
    expect(unwrap(ok('hello'))).toBe('hello');
  });

  it('unwrap() throws InvariantViolationError on error', () => {
    expect(() => unwrap(err(DomainError.of('nope')))).toThrow(InvariantViolationError);
  });
});

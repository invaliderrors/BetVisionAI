// libs/testing/src/fakes/fake-clock.port.ts
import type { ClockPort, IsoDateTime } from '@betvision/domain';

/** Deterministic clock fixed at a known instant; advanceable for time-dependent tests. */
export class FakeClockPort implements ClockPort {
  constructor(private fixed: number = Date.parse('2026-01-01T00:00:00.000Z')) {}

  advance(ms: number): void {
    this.fixed += ms;
  }

  set(iso: IsoDateTime): void {
    this.fixed = Date.parse(iso);
  }

  now(): IsoDateTime {
    return new Date(this.fixed).toISOString();
  }

  epochMillis(): number {
    return this.fixed;
  }
}

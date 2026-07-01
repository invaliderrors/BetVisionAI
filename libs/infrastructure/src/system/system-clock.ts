// libs/infrastructure/src/system/system-clock.ts
// Production ClockPort adapter (wall-clock, UTC ISO). Tests use FakeClockPort instead.
import { Injectable } from '@nestjs/common';
import type { ClockPort, IsoDateTime } from '@betvision/domain';

@Injectable()
export class SystemClock implements ClockPort {
  now(): IsoDateTime {
    return new Date().toISOString();
  }

  epochMillis(): number {
    return Date.now();
  }
}

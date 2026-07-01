// libs/domain/src/ports/clock.port.ts
import type { IsoDateTime } from './shared.dto';

/** Injectable clock — keeps domain/use-cases deterministic and testable (no `new Date()`). */
export interface ClockPort {
  now(): IsoDateTime;
  epochMillis(): number;
}

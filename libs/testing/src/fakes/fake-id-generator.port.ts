// libs/testing/src/fakes/fake-id-generator.port.ts
import type { IdGeneratorPort } from '@betvision/domain';

/** Deterministic counter-based ID source: `id-1`, `id-2`, ... */
export class FakeIdGeneratorPort implements IdGeneratorPort {
  private n = 0;

  constructor(private readonly prefix = 'id') {}

  newId(): string {
    return `${this.prefix}-${++this.n}`;
  }

  /** Reset the counter (handy between test cases). */
  reset(): void {
    this.n = 0;
  }
}

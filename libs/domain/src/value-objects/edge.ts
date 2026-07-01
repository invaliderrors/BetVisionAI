// libs/domain/src/value-objects/edge.ts
import { Result, ok, err, DomainError, DomainErrorCode, Guard } from '@betvision/shared';
import type { Probability } from './probability';
import type { ImpliedProbability } from './implied-probability';

/** Signed edge in [-1, 1]: modelProb - impliedProb (margin-adjusted implied recommended). */
export class Edge {
  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<Edge, DomainError> {
    const error = Guard.firstError(
      Guard.finiteNumber(value, 'edge'),
      Guard.inClosedRange(value, -1, 1, DomainErrorCode.EDGE_OUT_OF_RANGE, 'edge'),
    );
    return error ? err(error) : ok(new Edge(value));
  }

  static between(model: Probability, implied: ImpliedProbability): Result<Edge, DomainError> {
    return Edge.create(model.value - implied.value);
  }

  get isPositive(): boolean {
    return this.value > 0;
  }

  /** True when the edge clears the profile's minimum threshold. */
  meets(minEdge: number): boolean {
    return this.value >= minEdge;
  }
}

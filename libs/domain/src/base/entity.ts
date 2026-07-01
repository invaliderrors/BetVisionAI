// libs/domain/src/base/entity.ts
// Minimal DDD building blocks. Entities have identity + lifecycle; aggregate roots
// additionally buffer domain events for the application layer to dispatch.

import type { DomainEvent } from '../ports/event-bus.port';

/** An object distinguished by a stable identity rather than its attributes. */
export abstract class Entity<TId> {
  protected constructor(readonly id: TId) {}

  /** Identity equality — two entities are equal iff their ids match. */
  equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}

/** Consistency boundary; the only object the outside world persists / loads. */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected record(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }
}

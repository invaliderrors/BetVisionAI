// libs/testing/src/fakes/fake-event-bus.ts
import type { EventBusPort, DomainEvent } from '@betvision/domain';

/** Captures every published event for assertion; never dispatches anywhere. */
export class FakeEventBus implements EventBusPort {
  readonly published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    this.published.push(...events);
  }
}

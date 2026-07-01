// libs/domain/src/ports/event-bus.port.ts
import type { IsoDateTime } from './shared.dto';

/** Pipeline events (SPEC §7): MatchDataIngested, FeaturesComputed, PredictionReady, ReportGenerated. */
export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly name: string;
  readonly occurredAt: IsoDateTime;
  readonly payload: TPayload;
}

export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

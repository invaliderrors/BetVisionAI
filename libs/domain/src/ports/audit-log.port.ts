// libs/domain/src/ports/audit-log.port.ts
import type { UserId, IsoDateTime } from './shared.dto';

export interface AuditEntry {
  readonly actorId: UserId | null;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly occurredAt: IsoDateTime;
}

export interface AuditLogPort {
  record(entry: AuditEntry): Promise<void>;
}

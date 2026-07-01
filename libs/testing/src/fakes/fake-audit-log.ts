// libs/testing/src/fakes/fake-audit-log.ts
import type { AuditLogPort, AuditEntry } from '@betvision/domain';

/** Records every audit entry for later assertion. */
export class FakeAuditLog implements AuditLogPort {
  readonly entries: AuditEntry[] = [];

  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

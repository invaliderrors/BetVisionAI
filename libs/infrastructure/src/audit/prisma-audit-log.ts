// libs/infrastructure/src/audit/prisma-audit-log.ts
// AuditLogPort adapter -> append-only `audit_logs` table (SPEC §9/§19). Records
// security-relevant actions with actor, entity + structured metadata. Never stores secrets.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuditLogPort, AuditEntry } from '@betvision/domain';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaAuditLog implements AuditLogPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadataJson: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        createdAt: new Date(entry.occurredAt),
      },
    });
  }
}

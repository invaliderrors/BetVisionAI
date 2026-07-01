// apps/api/src/health/database.health-indicator.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@betvision/infrastructure';
import type { ComponentHealth } from './health.types';

/**
 * Readiness probe for Postgres: issues a trivial `SELECT 1` through the shared
 * Prisma connection pool. A thrown error (pool down, auth, network) maps to `down`
 * with the message, so the readiness endpoint reflects the REAL database state.
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ComponentHealth> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

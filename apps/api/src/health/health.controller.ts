// apps/api/src/health/health.controller.ts
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorCode } from '../common/http/envelope';
import { RedisHealthIndicator } from './redis.health-indicator';
import type {
  ComponentHealth,
  HealthChecks,
  LivenessResult,
  ReadinessResult,
} from './health.types';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly redisHealth: RedisHealthIndicator) {}

  /** Liveness — the process is up and able to serve. Never touches dependencies. */
  @Get()
  liveness(): LivenessResult {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness — dependencies are reachable. Currently gated on Redis; DB lands in Phase 4. */
  @Get('ready')
  async readiness(): Promise<ReadinessResult> {
    const redis = await this.redisHealth.check();
    // TODO(Phase 4): replace with a real Prisma/Postgres check. Stubbed 'up' until then.
    const database: ComponentHealth = { status: 'up' };

    const checks: HealthChecks = { database, redis };
    const ready = Object.values(checks).every((c) => c.status === 'up');

    if (!ready) {
      throw new ServiceUnavailableException({
        code: ApiErrorCode.SERVICE_UNAVAILABLE,
        checks,
      });
    }

    return { status: 'ok', checks };
  }
}

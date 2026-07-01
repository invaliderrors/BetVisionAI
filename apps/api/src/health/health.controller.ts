// apps/api/src/health/health.controller.ts
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorCode } from '../common/http/envelope';
import { RedisHealthIndicator } from './redis.health-indicator';
import { DatabaseHealthIndicator } from './database.health-indicator';
import type {
  HealthChecks,
  LivenessResult,
  ReadinessResult,
} from './health.types';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly redisHealth: RedisHealthIndicator,
    private readonly databaseHealth: DatabaseHealthIndicator,
  ) {}

  /** Liveness — the process is up and able to serve. Never touches dependencies. */
  @Get()
  liveness(): LivenessResult {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness — dependencies (Postgres + Redis) are reachable via real probes. */
  @Get('ready')
  async readiness(): Promise<ReadinessResult> {
    const [database, redis] = await Promise.all([
      this.databaseHealth.check(),
      this.redisHealth.check(),
    ]);

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

// apps/api/src/health/redis.health-indicator.ts
import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '@betvision/infrastructure';
import type { ComponentHealth } from './health.types';

/** Minimal surface of the redis client the readiness probe needs (keeps it easy to fake). */
export interface RedisPinger {
  ping(): Promise<string>;
}

@Injectable()
export class RedisHealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisPinger) {}

  async check(): Promise<ComponentHealth> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? { status: 'up' } : { status: 'down' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

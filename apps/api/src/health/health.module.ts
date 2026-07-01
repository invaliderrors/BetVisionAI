// apps/api/src/health/health.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health-indicator';
import { DatabaseHealthIndicator } from './database.health-indicator';

@Module({
  controllers: [HealthController],
  providers: [RedisHealthIndicator, DatabaseHealthIndicator],
})
export class HealthModule {}

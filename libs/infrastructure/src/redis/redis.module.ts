// libs/infrastructure/src/redis/redis.module.ts
// Provides a single, shared ioredis client built from the validated AppConfig.
// `lazyConnect` keeps construction side-effect-free (no socket until first use),
// which makes DI graphs safe to build in tests and at boot without a live Redis.
import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Redis =>
        new Redis(config.redisUrl, {
          lazyConnect: true,
          // Required by BullMQ; also fine for the readiness ping/cache client.
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

// libs/infrastructure/src/auth/auth-infra.module.ts
// @Global composition of the Phase-5 outbound adapters, each bound to its DOMAIN port token
// so application use cases depend only on the port, never the concrete adapter. Relies on the
// other @Global modules (ConfigModule -> APP_CONFIG, RedisModule -> REDIS_CLIENT, PrismaModule
// -> PrismaService) already being loaded by the composition root.
import { Global, Module } from '@nestjs/common';
import {
  AUDIT_LOG,
  CACHE,
  CLOCK,
  ID_GENERATOR,
  NOTIFICATION,
  PASSWORD_HASHER,
  REFRESH_TOKEN_STORE,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '@betvision/domain';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { PrismaUserRepository } from '../persistence/repositories/prisma-user.repository';
import { PrismaAuditLog } from '../audit/prisma-audit-log';
import { LogNotificationAdapter } from '../notification/log-notification.adapter';
import { SystemClock } from '../system/system-clock';
import { UuidIdGenerator } from '../system/uuid-id-generator';
import { RedisCacheAdapter } from '../cache/redis-cache.adapter';
import { RedisRefreshTokenStore } from './redis-refresh-token-store';
import { Argon2PasswordHasher } from './argon2-password-hasher';
import { JwtTokenService } from './jwt-token-service';

@Global()
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: AUDIT_LOG, useClass: PrismaAuditLog },
    { provide: NOTIFICATION, useClass: LogNotificationAdapter },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    {
      provide: CACHE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => new RedisCacheAdapter(redis),
    },
    {
      provide: REFRESH_TOKEN_STORE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => new RedisRefreshTokenStore(redis),
    },
    {
      provide: PASSWORD_HASHER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.nodeEnv === 'test'
          ? Argon2PasswordHasher.forTests()
          : new Argon2PasswordHasher(),
    },
    {
      provide: TOKEN_SERVICE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new JwtTokenService(
          config.jwt.accessSecret,
          config.jwt.refreshSecret,
          config.jwt.accessTtlSeconds,
          config.jwt.refreshTtlSeconds,
        ),
    },
  ],
  exports: [
    USER_REPOSITORY,
    AUDIT_LOG,
    NOTIFICATION,
    CLOCK,
    ID_GENERATOR,
    CACHE,
    REFRESH_TOKEN_STORE,
    PASSWORD_HASHER,
    TOKEN_SERVICE,
  ],
})
export class AuthInfraModule {}

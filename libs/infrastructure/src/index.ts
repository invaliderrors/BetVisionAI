// Config wiring
export * from './config/config.module';

// Redis client
export * from './redis/redis.constants';
export * from './redis/redis.module';

// i18n adapter (implements the domain I18nPort)
export * from './i18n/i18n-translator';
export * from './i18n/nest-i18n.adapter';

// Prisma / persistence (adapters bound to the domain repo ports).
// NOTE: only the service + module are exported. Mappers, repository classes and
// generated Prisma types stay internal so Prisma never leaks past this boundary.
export * from './prisma/prisma.service';
export * from './prisma/prisma.module';

// System adapters (ClockPort / IdGeneratorPort).
export * from './system/system-clock';
export * from './system/uuid-id-generator';

// Auth / security adapters (Phase 5). The @Global AuthInfraModule binds them to their
// domain port tokens; the classes are exported for explicit composition/tests. The Prisma
// user repository + audit adapter stay internal (bound only via AuthInfraModule).
export * from './cache/redis-cache.adapter';
export * from './auth/argon2-password-hasher';
export * from './auth/jwt-token-service';
export * from './auth/redis-refresh-token-store';
export * from './notification/log-notification.adapter';
export * from './auth/auth-infra.module';

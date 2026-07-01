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

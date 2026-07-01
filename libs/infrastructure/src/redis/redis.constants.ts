// libs/infrastructure/src/redis/redis.constants.ts
/** DI token for the shared ioredis client (readiness checks, cache, BullMQ connection). */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

// apps/worker/src/queue/queue.constants.ts
/** DI token for the primary BullMQ queue. */
export const BETVISION_QUEUE = Symbol('BETVISION_QUEUE');

/** Name of the primary BullMQ queue (job producers/consumers land in Phase 8). */
export const BETVISION_QUEUE_NAME = 'betvision';

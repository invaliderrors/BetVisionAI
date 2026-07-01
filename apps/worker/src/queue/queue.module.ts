// apps/worker/src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { BETVISION_QUEUE, BETVISION_QUEUE_NAME } from './queue.constants';
import { WorkerBootstrapService } from './worker-bootstrap.service';

/**
 * Builds ioredis connection options from the validated REDIS_URL. BullMQ manages its own
 * ioredis client from these options (using a plain object avoids the type clash between
 * the top-level ioredis and the copy bullmq bundles).
 */
function connectionFromUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.username ? { username: url.username } : {}),
    ...(url.password ? { password: url.password } : {}),
    // Required by BullMQ blocking commands.
    maxRetriesPerRequest: null,
  };
}

@Module({
  providers: [
    {
      provide: BETVISION_QUEUE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Queue =>
        new Queue(BETVISION_QUEUE_NAME, {
          connection: connectionFromUrl(config.redisUrl),
        }),
    },
    WorkerBootstrapService,
  ],
  exports: [BETVISION_QUEUE],
})
export class QueueModule {}

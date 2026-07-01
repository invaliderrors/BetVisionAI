// apps/worker/src/queue/worker-bootstrap.service.ts
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { BETVISION_QUEUE } from './queue.constants';

/**
 * Opens the worker's BullMQ/Redis connection on boot and logs readiness. Actual queue
 * consumers arrive in Phase 8 — this only proves the standalone bootstrap and a live
 * Redis connection (via the queue's own ioredis client).
 */
@Injectable()
export class WorkerBootstrapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerBootstrapService.name);

  constructor(
    @Inject(BETVISION_QUEUE) private readonly queue: Queue,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    // Resolves to the queue's ioredis client; attaching listeners does not block boot,
    // so a temporarily-unreachable Redis does not stall the worker (it retries).
    const client = await this.queue.client;
    const logReady = (): void =>
      this.logger.log(`Redis connection is ready (${this.config.redisUrl}).`);

    // The client may already be connected by the time we attach (avoid a missed event).
    if (client.status === 'ready') {
      logReady();
    }
    client.on('ready', logReady);
    client.on('error', (error: Error) =>
      this.logger.error(`Redis connection error: ${error.message}`),
    );

    this.logger.log(
      `BullMQ queue "${this.queue.name}" initialized — worker ready.`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

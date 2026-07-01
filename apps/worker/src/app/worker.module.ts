// apps/worker/src/app/worker.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@betvision/infrastructure';
import { QueueModule } from '../queue/queue.module';

/** Root module for the standalone (non-HTTP) BullMQ worker. */
@Module({
  imports: [ConfigModule, QueueModule],
})
export class WorkerModule {}

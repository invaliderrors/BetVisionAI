// apps/worker/src/main.ts
// Standalone Nest application context — NO HTTP server, NO app.listen / port binding.
// Boots the DI graph (Config + Redis + BullMQ), which logs "worker ready" on init.
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app/worker.module';

async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(WorkerModule);
  context.enableShutdownHooks();
  Logger.log(
    'Worker started as a standalone context (no HTTP server).',
    'Worker',
  );
}

bootstrap().catch((error: unknown) => {
  new Logger('Worker').error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});

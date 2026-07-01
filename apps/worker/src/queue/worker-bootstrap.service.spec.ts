import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { WorkerModule } from '../app/worker.module';
import { BETVISION_QUEUE } from './queue.constants';
import { WorkerBootstrapService } from './worker-bootstrap.service';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  isProduction: false,
  port: 0,
  databaseUrl: 'postgresql://user:pass@localhost:5432/db?schema=public',
  redisUrl: 'redis://localhost:6379',
  jwt: {
    accessSecret: 'x'.repeat(32),
    refreshSecret: 'y'.repeat(32),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604800,
  },
  defaultLocale: 'en',
  providerKeys: {},
  dataSourceMode: 'dev',
  llmMode: 'dev',
};

/** Minimal in-memory fakes standing in for BullMQ's queue and its ioredis client. */
class FakeRedisClient {
  readonly handlers = new Map<string, (arg: never) => void>();
  on(event: string, handler: (arg: never) => void): this {
    this.handlers.set(event, handler);
    return this;
  }
}

class FakeQueue {
  readonly name = 'betvision';
  closeCalls = 0;
  readonly redisClient = new FakeRedisClient();
  get client(): Promise<FakeRedisClient> {
    return Promise.resolve(this.redisClient);
  }
  async close(): Promise<void> {
    this.closeCalls += 1;
  }
}

describe('WorkerBootstrapService (standalone worker wiring)', () => {
  it('resolves via the WorkerModule DI graph and boots the BullMQ connection, logging readiness', async () => {
    const fakeQueue = new FakeQueue();
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({ imports: [WorkerModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(testConfig)
      .overrideProvider(BETVISION_QUEUE)
      .useValue(fakeQueue)
      .compile();

    const service = moduleRef.get(WorkerBootstrapService);
    expect(service).toBeInstanceOf(WorkerBootstrapService);

    await service.onModuleInit();

    // A Redis (ready + error) listener pair is registered on the queue's client.
    expect(fakeQueue.redisClient.handlers.has('ready')).toBe(true);
    expect(fakeQueue.redisClient.handlers.has('error')).toBe(true);

    const readyLogged = logSpy.mock.calls.some((call) =>
      String(call[0]).toLowerCase().includes('worker ready'),
    );
    expect(readyLogged).toBe(true);

    await moduleRef.close();
    expect(fakeQueue.closeCalls).toBe(1);

    logSpy.mockRestore();
  });
});

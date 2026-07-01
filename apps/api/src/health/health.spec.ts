import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { PrismaService, REDIS_CLIENT } from '@betvision/infrastructure';
import { AppModule } from '../app/app.module';
import { correlationIdMiddleware } from '../common/correlation/correlation-id.middleware';

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
  dataSourceMode: 'dev',
  llmMode: 'dev',
};

interface FakeRedis {
  ping: () => Promise<string>;
}
interface FakePrisma {
  $queryRaw: (...args: unknown[]) => Promise<unknown>;
}

const healthyPrisma: FakePrisma = {
  $queryRaw: async () => [{ ok: 1 }],
};

async function bootApp(
  redis: FakeRedis,
  prisma: FakePrisma = healthyPrisma,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(testConfig)
    .overrideProvider(REDIS_CLIENT)
    .useValue(redis)
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(correlationIdMiddleware);
  await app.init();
  return app;
}

describe('Health (integration)', () => {
  describe('when Redis is reachable', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await bootApp({ ping: async () => 'PONG' });
    });

    afterAll(async () => {
      await app?.close();
    });

    it('GET /api/health returns 200 liveness wrapped in the success envelope', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.error).toBeNull();
      expect(res.body.data.status).toBe('ok');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
    });

    it('GET /api/health/ready returns 200 with redis up', async () => {
      const res = await request(app.getHttpServer()).get('/api/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.checks.redis.status).toBe('up');
      expect(res.body.data.checks.database.status).toBe('up');
    });
  });

  describe('when Redis is unreachable', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await bootApp({
        ping: async () => {
          throw new Error('ECONNREFUSED');
        },
      });
    });

    afterAll(async () => {
      await app?.close();
    });

    it('GET /api/health/ready returns 503 with the error envelope reflecting Redis down', async () => {
      const res = await request(app.getHttpServer()).get('/api/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.data).toBeNull();
      expect(res.body.error.code).toBe('errors.service_unavailable');
      expect(typeof res.body.error.message).toBe('string');
      expect(res.body.error.details.redis.status).toBe('down');
    });
  });

  describe('when the database is unreachable', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await bootApp(
        { ping: async () => 'PONG' },
        {
          $queryRaw: async () => {
            throw new Error('ECONNREFUSED');
          },
        },
      );
    });

    afterAll(async () => {
      await app?.close();
    });

    it('GET /api/health/ready returns 503 reflecting the real DB probe failing', async () => {
      const res = await request(app.getHttpServer()).get('/api/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.data).toBeNull();
      expect(res.body.error.code).toBe('errors.service_unavailable');
      expect(res.body.error.details.database.status).toBe('down');
      expect(res.body.error.details.redis.status).toBe('up');
    });
  });
});

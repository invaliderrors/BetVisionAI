import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { I18nModule, I18nService } from 'nestjs-i18n';
import request from 'supertest';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { I18N } from '@betvision/domain';
import { NestI18nAdapter } from '@betvision/infrastructure';
import { DomainError, DomainErrorCode } from '@betvision/shared';
import { i18nOptions } from './i18n.options';
import { AllExceptionsFilter } from '../common/exceptions/all-exceptions.filter';
import { DomainErrorException } from '../common/exceptions/domain-error.exception';
import { ResponseEnvelopeInterceptor } from '../common/http/response-envelope.interceptor';
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

/** Test-only controller that raises a domain error (code + params, never a localized string). */
@Controller('diag')
class DiagController {
  @Get('domain-error')
  domainError(): never {
    throw new DomainErrorException(
      DomainError.of(DomainErrorCode.PROBABILITY_OUT_OF_RANGE, {
        field: 'probability',
        value: 5,
        min: 0,
        max: 1,
      }),
    );
  }

  @Get('ok')
  ok(): { hello: string } {
    return { hello: 'world' };
  }
}

describe('i18n + response envelope (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [I18nModule.forRoot(i18nOptions())],
      controllers: [DiagController],
      providers: [
        { provide: APP_CONFIG, useValue: testConfig },
        {
          provide: I18N,
          inject: [I18nService],
          useFactory: (i18n: I18nService) =>
            new NestI18nAdapter({
              translate: (key, options) => String(i18n.translate(key, options)),
            }),
        },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(correlationIdMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('localizes a DomainError code to ENGLISH for Accept-Language: en', async () => {
    const res = await request(app.getHttpServer())
      .get('/diag/domain-error')
      .set('Accept-Language', 'en');

    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('domain.vo.probability_out_of_range');
    expect(res.body.error.message).toBe(
      'Probability must be between 0 and 1, but got 5.',
    );
    expect(typeof res.body.error.correlationId).toBe('string');
    expect(res.body.error.correlationId.length).toBeGreaterThan(0);
  });

  it('localizes the SAME DomainError code to SPANISH for Accept-Language: es', async () => {
    const res = await request(app.getHttpServer())
      .get('/diag/domain-error')
      .set('Accept-Language', 'es');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('domain.vo.probability_out_of_range');
    expect(res.body.error.message).toBe(
      'La probabilidad debe estar entre 0 y 1, pero se recibió 5.',
    );
  });

  it('proves EN and ES render DIFFERENT prose from the identical code + params', async () => {
    const en = await request(app.getHttpServer())
      .get('/diag/domain-error')
      .set('Accept-Language', 'en');
    const es = await request(app.getHttpServer())
      .get('/diag/domain-error')
      .set('Accept-Language', 'es');

    // Surface the proof in the test output.
    console.log(
      `\n[i18n PROOF] code=${en.body.error.code}\n  EN: ${en.body.error.message}\n  ES: ${es.body.error.message}\n`,
    );

    expect(en.body.error.code).toBe(es.body.error.code);
    expect(en.body.error.message).not.toBe(es.body.error.message);
  });

  it('falls back to the default locale (en) when Accept-Language is absent', async () => {
    const res = await request(app.getHttpServer()).get('/diag/domain-error');

    expect(res.body.error.message).toBe(
      'Probability must be between 0 and 1, but got 5.',
    );
  });

  it('wraps successful responses in { data, error: null }', async () => {
    const res = await request(app.getHttpServer()).get('/diag/ok');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { hello: 'world' }, error: null });
  });
});

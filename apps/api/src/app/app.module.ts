import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { I18nModule, I18nService } from 'nestjs-i18n';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { I18N } from '@betvision/domain';
import {
  ConfigModule,
  NestI18nAdapter,
  RedisModule,
} from '@betvision/infrastructure';
import { i18nOptions } from './i18n.options';
import { HealthModule } from '../health/health.module';
import { AllExceptionsFilter } from '../common/exceptions/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../common/http/response-envelope.interceptor';
import { ensureCorrelationId } from '../common/correlation/correlation';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    LoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level:
            config.nodeEnv === 'test'
              ? 'silent'
              : config.isProduction
                ? 'info'
                : 'debug',
          // Single source of truth for the request id (shared with the error envelope).
          genReqId: (req, res) => ensureCorrelationId(req, res),
          // Never log secrets or auth material.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'res.headers["set-cookie"]',
            ],
            remove: true,
          },
        },
      }),
    }),
    I18nModule.forRoot(i18nOptions()),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    // Bind the domain I18nPort to the nestjs-i18n backed adapter.
    {
      provide: I18N,
      inject: [I18nService],
      useFactory: (i18n: I18nService) =>
        new NestI18nAdapter({
          translate: (key, options) => String(i18n.translate(key, options)),
        }),
    },
  ],
})
export class AppModule {}

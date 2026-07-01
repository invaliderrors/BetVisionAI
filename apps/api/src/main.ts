import { Logger as NestLogger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { AppModule } from './app/app.module';
import { correlationIdMiddleware } from './common/correlation/correlation-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured JSON logging via pino for all subsequent Nest logs.
  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.use(cookieParser());
  app.use(correlationIdMiddleware);
  app.setGlobalPrefix('api');
  // URI versioning: versioned controllers serve under /api/v1/... while unversioned ones
  // (e.g. health) stay at /api/... . No default version keeps health at /api/health.
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  const config = app.get<AppConfig>(APP_CONFIG);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BetVision AI API')
    .setDescription('BetVision AI backend API (REST)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.port);

  app
    .get(Logger)
    .log(
      `API listening on http://localhost:${config.port}/api (docs: /api/docs)`,
    );
}

bootstrap().catch((error: unknown) => {
  // Fail-fast: invalid env or a boot error must abort with a clear message.
  new NestLogger('Bootstrap').error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});

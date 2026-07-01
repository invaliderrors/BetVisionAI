// apps/api/src/common/exceptions/all-exceptions.filter.ts
// Single global exception filter that renders EVERY failure as the uniform error envelope
// and localizes the message via the domain I18nPort using the request's Accept-Language.
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '@betvision/config';
import { I18N, type I18nPort } from '@betvision/domain';
import type { DomainError, ErrorParams } from '@betvision/shared';
import {
  ApiErrorCode,
  type ApiErrorEnvelope,
  statusToApiErrorCode,
} from '../http/envelope';
import { ensureCorrelationId } from '../correlation/correlation';
import { resolveLocale } from '../i18n/locale.util';
import { DomainErrorException } from './domain-error.exception';

interface MappedError {
  readonly status: number;
  readonly code: string;
  readonly params: ErrorParams;
  readonly details?: unknown;
  /** Present only for genuinely unexpected (5xx) failures — logged, never returned. */
  readonly internal?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Inject(I18N) private readonly i18n: I18nPort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const correlationId = req.correlationId ?? ensureCorrelationId(req, res);
    const locale = resolveLocale(
      req.headers['accept-language'],
      this.config.defaultLocale,
    );

    const mapped = this.mapException(exception);
    const message = this.i18n.resolve(mapped.code, mapped.params, locale);

    if (mapped.internal !== undefined) {
      // Genuinely unexpected (bug/invariant) — capture the stack, never leak it to the client.
      this.logger.error(
        { correlationId, code: mapped.code, err: serializeError(mapped.internal) },
        'Unhandled exception',
      );
    } else {
      // Handled, expected failure (validation, 404, 503 readiness, domain error, ...).
      this.logger.warn(
        { correlationId, code: mapped.code, status: mapped.status },
        'Request failed',
      );
    }

    const body: ApiErrorEnvelope = {
      data: null,
      error: {
        code: mapped.code,
        message,
        correlationId,
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
    };

    res.status(mapped.status).json(body);
  }

  private mapException(exception: unknown): MappedError {
    // 1. Domain error carried via the HTTP bridge.
    if (exception instanceof DomainErrorException) {
      return {
        status: exception.getStatus(),
        code: exception.domainError.code,
        params: exception.domainError.params,
      };
    }

    // 2. Raw DomainError thrown directly (duck-typed; DomainError is a plain class).
    if (isDomainError(exception)) {
      return { status: 400, code: exception.code, params: exception.params };
    }

    // 3. Framework HttpException (incl. ValidationPipe, 404, 503, ...).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = statusToApiErrorCode(status);
      const { code: refinedCode, details } = this.refineHttpException(
        exception,
        code,
      );
      return { status, code: refinedCode, params: {}, details };
    }

    // 4. Anything else — a genuine bug/invariant violation. Never leak internals.
    return {
      status: 500,
      code: ApiErrorCode.INTERNAL,
      params: {},
      internal: exception,
    };
  }

  private refineHttpException(
    exception: HttpException,
    fallbackCode: string,
  ): { code: string; details?: unknown } {
    const response = exception.getResponse();
    if (typeof response !== 'object' || response === null) {
      return { code: fallbackCode };
    }

    const record = response as Record<string, unknown>;

    // class-validator via ValidationPipe -> `message` is a string[].
    if (Array.isArray(record['message'])) {
      return { code: ApiErrorCode.VALIDATION, details: record['message'] };
    }

    // Health readiness (or other structured payloads) expose `checks`.
    if (record['checks'] !== undefined) {
      return { code: fallbackCode, details: record['checks'] };
    }

    return { code: fallbackCode };
  }
}

function isDomainError(value: unknown): value is DomainError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { _tag?: unknown })._tag === 'DomainError'
  );
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}

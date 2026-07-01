// apps/api/src/common/http/response-envelope.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiSuccessEnvelope } from './envelope';

/**
 * Wraps every successful controller result in the uniform success envelope
 * `{ data, error: null }`. Failures never reach here — they are handled by the
 * global exception filter, which emits the error envelope.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiSuccessEnvelope<T | null>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessEnvelope<T | null>> {
    return next.handle().pipe(
      map((data) => ({ data: data ?? null, error: null })),
    );
  }
}

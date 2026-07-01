// apps/api/src/common/correlation/correlation.ts
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Request shape carrying the correlation id we attach to every request. */
type CorrelationRequest = IncomingMessage & { correlationId?: string };

/**
 * Idempotently derive the request's correlation id and mirror it onto:
 *  - `req.correlationId` (read by the exception filter for the error envelope),
 *  - the request headers (so any later reader — pino's genReqId — sees the same id),
 *  - the response headers (so clients can correlate).
 *
 * Deliberately order-independent: whether pino's `genReqId` or the correlation middleware
 * runs first, both call this and converge on the SAME id (client-supplied id wins).
 */
export function ensureCorrelationId(
  req: CorrelationRequest,
  res: ServerResponse,
): string {
  if (req.correlationId) return req.correlationId;

  const incoming = req.headers[CORRELATION_ID_HEADER];
  const existing = Array.isArray(incoming) ? incoming[0] : incoming;
  const id = existing && existing.length > 0 ? existing : randomUUID();

  req.correlationId = id;
  req.headers[CORRELATION_ID_HEADER] = id;
  if (!res.headersSent) {
    res.setHeader(CORRELATION_ID_HEADER, id);
  }
  return id;
}

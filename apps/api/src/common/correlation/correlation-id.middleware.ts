// apps/api/src/common/correlation/correlation-id.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import { ensureCorrelationId } from './correlation';

/**
 * Functional Express middleware that stamps a correlation id on every request.
 * Applied globally at bootstrap (`app.use`) so it runs before route handlers and is
 * picked up by structured logging and the exception filter.
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.correlationId = ensureCorrelationId(req, res);
  next();
}

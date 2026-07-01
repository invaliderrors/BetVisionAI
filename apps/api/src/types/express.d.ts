// apps/api/src/types/express.d.ts
// Augment Express' Request with the correlation id (correlation middleware) and the
// authenticated actor (JwtAuthGuard).
import 'express';
import type { AuthenticatedActor } from '@betvision/application';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: AuthenticatedActor;
    }
  }
}

export {};

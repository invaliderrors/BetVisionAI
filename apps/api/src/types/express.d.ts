// apps/api/src/types/express.d.ts
// Augment Express' Request with the correlation id set by the correlation middleware.
import 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export {};

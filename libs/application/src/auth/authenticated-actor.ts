// libs/application/src/auth/authenticated-actor.ts
// The identity extracted from a verified access token and attached to the request by the
// API's JwtAuthGuard. Use cases receive `actor.userId` for ownership + audit trails.
import type { UserId, Locale } from '@betvision/domain';

export interface AuthenticatedActor {
  readonly userId: UserId;
  readonly email: string;
  readonly role: string;
  readonly locale: Locale;
}

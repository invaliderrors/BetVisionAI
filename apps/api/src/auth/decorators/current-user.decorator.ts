// apps/api/src/auth/decorators/current-user.decorator.ts
// Injects the authenticated actor (set by JwtAuthGuard) into a handler parameter.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedActor } from '@betvision/application';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedActor | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user;
  },
);

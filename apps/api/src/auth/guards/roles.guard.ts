// apps/api/src/auth/guards/roles.guard.ts
// RBAC gate: reads the @Roles(...) metadata and checks the authenticated actor's role via the
// application RBAC policy. Must run AFTER JwtAuthGuard (which populates req.user). A missing or
// disallowed role yields a localized 403 (domain.auth.forbidden).
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { requireRole } from '@betvision/application';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DomainErrorException } from '../../common/exceptions/domain-error.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const error = requireRole({ role: req.user?.role ?? '' }, roles);
    if (error) throw new DomainErrorException(error, HttpStatus.FORBIDDEN);
    return true;
  }
}

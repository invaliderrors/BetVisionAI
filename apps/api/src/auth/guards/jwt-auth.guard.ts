// apps/api/src/auth/guards/jwt-auth.guard.ts
// Authenticates a request from the `Authorization: Bearer <accessToken>` header by verifying
// it through the domain TokenServicePort. On success the decoded actor is attached to the
// request; otherwise a 401 (localized `errors.unauthorized`) is raised.
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_SERVICE, type TokenServicePort } from '@betvision/domain';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(req.headers['authorization']);
    if (!token) throw new UnauthorizedException();

    const claims = await this.tokens.verifyAccessToken(token);
    if (!claims) throw new UnauthorizedException();

    req.user = {
      userId: claims.userId,
      email: claims.email,
      role: claims.role,
      locale: claims.locale,
    };
    return true;
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}

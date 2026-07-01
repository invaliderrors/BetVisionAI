// apps/api/src/common/http/auth-cookie.ts
// Helpers for the refresh-token cookie. httpOnly + secure (in prod) + sameSite; scoped by
// path to the auth routes so it is only ever sent to /refresh and /logout (never to the
// rest of the API). The access token is returned in the body, never as a cookie.
import type { Request, Response } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_COOKIE];
}

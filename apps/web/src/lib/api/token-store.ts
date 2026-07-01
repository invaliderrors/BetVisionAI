// apps/web/src/lib/api/token-store.ts
// The access token lives ONLY in memory (never localStorage/sessionStorage), per SPEC §8.
// It is re-obtained on load via a silent /auth/refresh against the httpOnly refresh cookie.
// Kept in a standalone module so both the fetch client and the auth store can read/write it
// without a circular import.

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

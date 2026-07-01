// apps/web/src/lib/api/client.ts
// Typed fetch wrapper for the BetVision AI API. Responsibilities:
//   - Prefix requests with the versioned base URL and send the httpOnly refresh cookie
//     (`credentials: 'include'`).
//   - Attach the in-memory access token as a Bearer header.
//   - Forward the active locale as `Accept-Language` so the API localizes error messages.
//   - Unwrap the `{ data, error }` envelope; throw a typed `ApiError` on failure.
//   - On a 401, attempt `/auth/refresh` exactly once (single-flight), then retry the request.
//   - Optionally validate the `data` payload against a zod schema from libs/contracts.
import type { ZodType } from 'zod';
import { ApiError, type ApiEnvelope } from './errors';
import { getAccessToken, setAccessToken, clearAccessToken } from './token-store';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api/v1`;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions<T> {
  method?: HttpMethod;
  /** JSON-serializable request body. */
  body?: unknown;
  /** Zod schema to validate + type the unwrapped `data`. */
  schema?: ZodType<T>;
  /** Active UI locale, forwarded as Accept-Language. */
  locale?: string;
  /** Attach the Bearer access token (default true). */
  auth?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  _retrying?: boolean;
  signal?: AbortSignal;
}

/** Endpoints that must never trigger the 401 -> refresh -> retry dance. */
const NO_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
]);

let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(locale?: string): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: locale ? { 'Accept-Language': locale } : undefined,
        });
        const envelope = (await res.json()) as ApiEnvelope<{
          accessToken: string;
        }>;
        if (!res.ok || envelope.error || !envelope.data?.accessToken) {
          clearAccessToken();
          return false;
        }
        setAccessToken(envelope.data.accessToken);
        return true;
      } catch {
        clearAccessToken();
        return false;
      } finally {
        // Reset after the microtask settles so concurrent callers share this attempt.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    schema,
    locale,
    auth = true,
    _retrying = false,
    signal,
  } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (locale) headers['Accept-Language'] = locale;
  const token = getAccessToken();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    throw new ApiError({
      code: 'errors.network',
      message: cause instanceof Error ? cause.message : 'Network request failed',
      status: 0,
    });
  }

  // 204 / empty body.
  const text = await res.text();
  const envelope: ApiEnvelope<T> = text
    ? (JSON.parse(text) as ApiEnvelope<T>)
    : ({ data: null, error: null } as ApiEnvelope<T>);

  if (!res.ok || envelope.error) {
    // Transparent single retry after a successful token refresh.
    if (
      res.status === 401 &&
      auth &&
      !_retrying &&
      !NO_REFRESH_PATHS.has(path)
    ) {
      const refreshed = await attemptRefresh(locale);
      if (refreshed) {
        return apiRequest<T>(path, { ...options, _retrying: true });
      }
    }
    const err = envelope.error;
    throw new ApiError({
      code: err?.code ?? 'errors.internal',
      message: err?.message ?? res.statusText,
      status: res.status,
      correlationId: err?.correlationId,
      details: err?.details,
    });
  }

  const data = envelope.data as T;
  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError({
        code: 'errors.contract_mismatch',
        message: 'Response did not match the expected contract',
        status: res.status,
        details: parsed.error.issues,
      });
    }
    return parsed.data;
  }
  return data;
}

export const apiConfig = { baseUrl: BASE_URL, origin: API_ORIGIN };

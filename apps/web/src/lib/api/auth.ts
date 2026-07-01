// apps/web/src/lib/api/auth.ts
// Typed auth API calls. Requests + responses are validated against the shared zod contracts
// from libs/contracts so FE and BE never drift. The access token returned by login/refresh is
// pushed into the in-memory token store by the caller (auth store).
import {
  authResponseSchema,
  refreshResponseSchema,
  userProfileDtoSchema,
  type AuthResponse,
  type RefreshResponse,
  type UserProfileDto,
  type LoginRequest,
  type RegisterRequest,
} from '@betvision/contracts';
import { apiRequest } from './client';

export function login(
  body: LoginRequest,
  locale?: string,
): Promise<AuthResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body,
    schema: authResponseSchema,
    locale,
    auth: false,
  });
}

export function register(
  body: RegisterRequest,
  locale?: string,
): Promise<UserProfileDto> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body,
    schema: userProfileDtoSchema,
    locale,
    auth: false,
  });
}

export function refresh(locale?: string): Promise<RefreshResponse> {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    schema: refreshResponseSchema,
    locale,
    auth: false,
  });
}

export function logout(locale?: string): Promise<{ success: true }> {
  return apiRequest('/auth/logout', {
    method: 'POST',
    locale,
    auth: false,
  });
}

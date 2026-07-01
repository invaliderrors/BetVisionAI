// apps/web/src/lib/api/users.ts
// Typed self-service user calls (/users/me). Validated against the shared zod contracts.
import {
  userProfileDtoSchema,
  type UserProfileDto,
  type UpdateProfileRequest,
  type SelfLimitRequest,
  type Locale,
} from '@betvision/contracts';
import { apiRequest } from './client';

export function getMe(locale?: string): Promise<UserProfileDto> {
  return apiRequest('/users/me', {
    method: 'GET',
    schema: userProfileDtoSchema,
    locale,
  });
}

export function updateProfile(
  body: UpdateProfileRequest,
  locale?: string,
): Promise<UserProfileDto> {
  return apiRequest('/users/me', {
    method: 'PATCH',
    body,
    schema: userProfileDtoSchema,
    locale,
  });
}

/** Persist the user's preferred locale (called by the header language switcher). */
export function updateLocale(
  nextLocale: Locale,
  requestLocale?: string,
): Promise<UserProfileDto> {
  return updateProfile({ locale: nextLocale }, requestLocale);
}

export function setSelfLimit(
  body: SelfLimitRequest,
  locale?: string,
): Promise<UserProfileDto> {
  return apiRequest('/users/me/self-limit', {
    method: 'POST',
    body,
    schema: userProfileDtoSchema,
    locale,
  });
}

// apps/api/src/common/http/envelope.ts
// The API's uniform response contract:
//   success -> { data, error: null }
//   failure -> { data: null, error: { code, message, correlationId, details? } }
// `code` is a STABLE machine string (doubles as the i18n message key); `message` is
// localized for the request's language.

/** Stable, typed API error codes. Each value is also an i18n catalog key. */
export const ApiErrorCode = {
  INTERNAL: 'errors.internal',
  BAD_REQUEST: 'errors.bad_request',
  VALIDATION: 'errors.validation',
  UNAUTHORIZED: 'errors.unauthorized',
  FORBIDDEN: 'errors.forbidden',
  NOT_FOUND: 'errors.not_found',
  SERVICE_UNAVAILABLE: 'errors.service_unavailable',
  TOO_MANY_REQUESTS: 'errors.too_many_requests',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly correlationId: string;
  readonly details?: unknown;
}

export interface ApiSuccessEnvelope<T> {
  readonly data: T;
  readonly error: null;
}

export interface ApiErrorEnvelope {
  readonly data: null;
  readonly error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

/** Map an HTTP status to its default (typed) API error code / i18n key. */
export function statusToApiErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.BAD_REQUEST;
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 429:
      return ApiErrorCode.TOO_MANY_REQUESTS;
    case 503:
      return ApiErrorCode.SERVICE_UNAVAILABLE;
    default:
      return ApiErrorCode.INTERNAL;
  }
}

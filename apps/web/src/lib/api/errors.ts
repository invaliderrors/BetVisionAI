// apps/web/src/lib/api/errors.ts
// Client-side view of the API's uniform response envelope and its error shape.
//   success -> { data, error: null }
//   failure -> { data: null, error: { code, message, correlationId, details? } }
// `code` is a STABLE machine string that doubles as an i18n key, so the UI localizes by code
// and only falls back to the server `message` when no local key exists.

export interface ApiErrorBody {
  code: string;
  message: string;
  correlationId: string;
  details?: unknown;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  error: null;
}

export interface ApiErrorEnvelope {
  data: null;
  error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

/** Thrown for every non-success API outcome. Carries the stable code for i18n + the status. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly correlationId?: string;
  readonly details?: unknown;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    correlationId?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.correlationId = params.correlationId;
    this.details = params.details;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

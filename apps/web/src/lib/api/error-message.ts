// apps/web/src/lib/api/error-message.ts
// Maps a thrown error to a stable i18n sub-key under the `errors` namespace. The UI localizes
// by the machine `code` (never the raw server message), falling back to a generic key.
import { isApiError } from './errors';

const KNOWN_CODES = new Set([
  'internal',
  'bad_request',
  'validation',
  'unauthorized',
  'forbidden',
  'not_found',
  'service_unavailable',
  'too_many_requests',
  'network',
  'contract_mismatch',
]);

/** Returns the key to use with `useTranslations('errors')`. */
export function errorSubKey(error: unknown): string {
  if (isApiError(error)) {
    const sub = error.code.startsWith('errors.')
      ? error.code.slice('errors.'.length)
      : error.code;
    if (KNOWN_CODES.has(sub)) return sub;
  }
  return 'internal';
}

// apps/api/src/common/i18n/locale.util.ts
import { SUPPORTED_LOCALES, type SupportedLocale } from '@betvision/config';

/**
 * Resolve the effective locale from the request's `Accept-Language` header, falling back
 * to the configured default. Only supported locales ('en' | 'es') are honored.
 */
export function resolveLocale(
  header: string | string[] | undefined,
  fallback: SupportedLocale,
): SupportedLocale {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return fallback;

  // First tag of the Accept-Language list, e.g. "es-ES,es;q=0.9,en;q=0.8" -> "es-es".
  const first = raw.split(',')[0]?.trim().toLowerCase() ?? '';
  const match = SUPPORTED_LOCALES.find((locale) => first.startsWith(locale));
  return match ?? fallback;
}
